"""Processador do outbox de avisos (docs/adr/0003 e 0018).

Chamado pelo banco a cada minuto (pg_cron + pg_net → POST /internal/notificacoes/processar). Pega os avisos
pendentes (`for update skip locked`: duas chamadas ao mesmo tempo não mandam o mesmo aviso), envia ao Teams e
marca `enviada`; se falhar, tenta de novo em 1 e 5 min e, na 3ª falha, marca `falhou` com o erro.
Falha no Teams nunca volta para quem fez a ação: o chamado já foi gravado antes.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import timedelta
from typing import Any

import asyncpg

from app.integracoes.teams.cartoes import DadosAviso, cartao, cartao_resumo
from app.integracoes.teams.conector import Conector, ErroTeams

log = logging.getLogger(__name__)

LOTE = 10
MAX_TENTATIVAS = 3
ESPERA = (timedelta(minutes=1), timedelta(minutes=5))
#: Aviso parado há mais tempo que isso não é mais enviado (ex.: antes de o bot existir).
VALIDADE = timedelta(hours=24)

ERRO_SEM_CONVERSA = "pessoa sem conversa com o bot (app do Teams não instalado)"
ERRO_ANTIGO = "aviso antigo (mais de 24 h): não enviado"

SQL_EXPIRAR = """
update public.notificacoes
   set status = 'falhou', erro = $1
 where status = 'pendente' and criado_em < now() - $2::interval
"""

SQL_FILA = """
select n.id, n.tipo, n.payload, n.tentativas, n.chamado_id, n.destinatario_id,
       c.titulo, c.status::text as status, c.prazo_sla, c.motivo_cancelamento,
       c.criado_em as chamado_criado_em,
       case when n.tipo = 'chamado_aberto' then app.proxima_abertura(c.criado_em) end as volta,
       (n.destinatario_id = c.solicitante_id) as para_solicitante,
       sol.nome as solicitante_nome, resp.nome as responsavel_nome,
       tc.teams_user_id, tc.conversation_id, tc.service_url,
       (select m.conteudo from public.mensagens m
         where m.chamado_id = c.id and not m.interna and m.autor_id is not null
           and m.autor_id <> n.destinatario_id and m.criado_em <= n.criado_em
         order by m.criado_em desc limit 1) as ultima_mensagem,
       (select t.motivo from public.transferencias t
         where t.chamado_id = c.id order by t.criado_em desc limit 1) as motivo_transferencia
  from public.notificacoes n
  left join public.chamados c on c.id = n.chamado_id
  join public.profiles dest on dest.id = n.destinatario_id
  left join public.profiles sol on sol.id = c.solicitante_id
  left join public.profiles resp on resp.id = c.responsavel_id
  left join lateral (
    select x.teams_user_id, x.conversation_id, x.service_url
      from public.teams_conversas x
     where x.profile_id = dest.id or x.email = lower(dest.email) or x.upn = lower(dest.email)
     order by (x.profile_id = dest.id) desc nulls last, x.atualizado_em desc
     limit 1
  ) tc on true
 where n.status = 'pendente' and n.canal = 'teams' and n.proxima_tentativa_em <= now()
 order by n.proxima_tentativa_em, n.id
 limit $1
 for update of n skip locked
"""


@dataclass
class Resultado:
    enviadas: int = 0
    falharam: int = 0
    adiadas: int = 0
    expiradas: int = 0


def dados_do_aviso(linha: asyncpg.Record | dict[str, Any]) -> DadosAviso:
    payload = linha["payload"]
    if isinstance(payload, str):  # asyncpg devolve jsonb como texto
        payload = json.loads(payload)
    return DadosAviso(
        tipo=linha["tipo"],
        payload=payload or {},
        chamado_id=int(linha["chamado_id"]),
        titulo=linha["titulo"],
        status=linha["status"],
        para_solicitante=bool(linha["para_solicitante"]),
        solicitante_nome=linha["solicitante_nome"],
        responsavel_nome=linha["responsavel_nome"],
        prazo=linha["prazo_sla"],
        motivo_cancelamento=linha["motivo_cancelamento"],
        ultima_mensagem=linha["ultima_mensagem"],
        motivo_transferencia=linha["motivo_transferencia"],
        criado_em=linha["chamado_criado_em"],
        volta=linha["volta"],
    )


async def processar(conn: asyncpg.Connection, conector: Conector, central: str) -> Resultado:
    resultado = Resultado()
    async with conn.transaction():
        expiradas = await conn.execute(SQL_EXPIRAR, ERRO_ANTIGO, VALIDADE)
        resultado.expiradas = int(expiradas.split()[-1])

        for linha in await conn.fetch(SQL_FILA, LOTE):
            if linha["conversation_id"] is None:
                await _falhou(conn, linha["id"], linha["tentativas"], ERRO_SEM_CONVERSA)
                resultado.falharam += 1
                continue

            if linha["tipo"] == "resumo_mensal":
                # Resumo do mês para o gestor (migration 0032): não é de um chamado.
                payload = linha["payload"]
                atividade = cartao_resumo(
                    json.loads(payload) if isinstance(payload, str) else payload,
                    central.rstrip("/"),
                )
            else:
                link = f"{central.rstrip('/')}/chamados/{linha['chamado_id']}"
                atividade = cartao(dados_do_aviso(linha), link)
            try:
                await conector.enviar(linha["service_url"], linha["conversation_id"], atividade)
            except ErroTeams as erro:
                tentativas = linha["tentativas"] + 1
                if tentativas >= MAX_TENTATIVAS:
                    await _falhou(conn, linha["id"], linha["tentativas"], str(erro))
                    resultado.falharam += 1
                else:
                    await conn.execute(
                        """update public.notificacoes
                              set tentativas = $2, erro = $3, proxima_tentativa_em = now() + $4::interval
                            where id = $1""",
                        linha["id"],
                        tentativas,
                        str(erro),
                        ESPERA[tentativas - 1],
                    )
                    resultado.adiadas += 1
                log.warning("aviso %s não enviado: %s", linha["id"], erro)
                continue

            await conn.execute(
                """update public.notificacoes
                      set status = 'enviada', enviado_em = now(), tentativas = tentativas + 1, erro = null
                    where id = $1""",
                linha["id"],
            )
            await conn.execute(
                """update public.teams_conversas
                      set ultimo_chamado_notificado = coalesce($2, ultimo_chamado_notificado),
                          profile_id = coalesce(profile_id, case
                            when exists (select 1 from public.teams_conversas o where o.profile_id = $3)
                            then null else $3 end)
                    where teams_user_id = $1""",
                linha["teams_user_id"],
                linha["chamado_id"],
                linha["destinatario_id"],
            )
            resultado.enviadas += 1
    return resultado


async def _falhou(
    conn: asyncpg.Connection, notificacao_id: int, tentativas: int, erro: str
) -> None:
    await conn.execute(
        "update public.notificacoes set status = 'falhou', tentativas = $2, erro = $3 where id = $1",
        notificacao_id,
        tentativas + 1,
        erro[:500],
    )
