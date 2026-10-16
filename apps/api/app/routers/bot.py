"""Bot do Teams (docs/adr/0018).

- POST /bot/mensagens: o Teams entrega aqui o que acontece com o bot (instalação, mensagem). A Central guarda
  a conversa de cada pessoa (para mandar avisos depois) e responde mensagens com a resposta automática.
- POST /internal/notificacoes/processar: o banco chama a cada minuto (pg_cron + pg_net) para enviar os avisos
  pendentes. Protegido pelo segredo X-Central-Secret.
"""

from __future__ import annotations

import hmac
import json
import logging
from dataclasses import asdict
from functools import lru_cache
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, Request, Response

from app.config import Settings, obter_settings
from app.db import Banco, obter_banco
from app.erros.catalogo import ErroApp
from app.integracoes.teams.cartoes import resposta_automatica
from app.integracoes.teams.conector import Conector, ConectorTeams, ErroTeams
from app.integracoes.teams.entrada import VerificadorTeams
from app.integracoes.teams.processador import processar

log = logging.getLogger(__name__)
router = APIRouter(tags=["bot"], include_in_schema=False)

TEXTO_PADRAO = (
    "Olá! Este canal é usado apenas para avisos e as mensagens enviadas aqui não são lidas "
    "pela equipe de TI."
)


@lru_cache
def _conector(app_id: str, segredo: str, tenant: str) -> ConectorTeams:
    return ConectorTeams(app_id, segredo, tenant)


@lru_cache
def _verificador(app_id: str, tenant: str) -> VerificadorTeams:
    return VerificadorTeams(app_id, tenant)


def obter_conector(settings: Annotated[Settings, Depends(obter_settings)]) -> Conector | None:
    if not (settings.bot_app_id and settings.bot_app_segredo and settings.bot_tenant_id):
        return None
    return _conector(
        settings.bot_app_id, settings.bot_app_segredo.get_secret_value(), settings.bot_tenant_id
    )


def obter_verificador(settings: Annotated[Settings, Depends(obter_settings)]) -> VerificadorTeams:
    if not (settings.bot_app_id and settings.bot_tenant_id):
        raise ErroApp("SEM_PERMISSAO", detalhe="bot não configurado")
    return _verificador(settings.bot_app_id, settings.bot_tenant_id)


ConectorDep = Annotated[Conector | None, Depends(obter_conector)]


# ------------------------------------------------------------------------- envio dos avisos
@router.post("/internal/notificacoes/processar")
async def processar_notificacoes(
    settings: Annotated[Settings, Depends(obter_settings)],
    banco: Annotated[Banco, Depends(obter_banco)],
    conector: ConectorDep,
    x_central_secret: Annotated[str | None, Header()] = None,
) -> dict[str, Any]:
    segredo = settings.processador_segredo
    esperado = segredo.get_secret_value() if segredo else ""
    if not esperado or not x_central_secret or not hmac.compare_digest(x_central_secret, esperado):
        raise ErroApp("SEM_PERMISSAO", detalhe="processador: segredo inválido")
    if conector is None:
        return {"configurado": False}
    async with banco.servico() as conn:
        resultado = await processar(conn, conector, settings.web_origem)
    return {"configurado": True, **asdict(resultado)}


# ------------------------------------------------------------------------- mensagens do Teams
SQL_CONVERSA_ATUAL = """
select email, upn from public.teams_conversas where teams_user_id = $1
"""

SQL_GUARDAR_CONVERSA = """
insert into public.teams_conversas
  (teams_user_id, tenant_id, conversation_id, service_url, email, upn, aad_object_id, profile_id)
values ($1, $2, $3, $4, $5, $6, $7, (
  select p.id from public.profiles p
   where lower(p.email) in ($5, $6)
     and not exists (select 1 from public.teams_conversas o
                      where o.profile_id = p.id and o.teams_user_id <> $1)
   limit 1))
on conflict (teams_user_id) do update set
  tenant_id       = excluded.tenant_id,
  conversation_id = excluded.conversation_id,
  service_url     = excluded.service_url,
  email           = coalesce(excluded.email, public.teams_conversas.email),
  upn             = coalesce(excluded.upn, public.teams_conversas.upn),
  aad_object_id   = coalesce(excluded.aad_object_id, public.teams_conversas.aad_object_id),
  profile_id      = coalesce(public.teams_conversas.profile_id, excluded.profile_id)
returning ultimo_chamado_notificado, profile_id
"""

TIPOS_ACEITOS = ("message", "conversationUpdate", "installationUpdate")


def _texto(valor: Any) -> str | None:
    return valor if isinstance(valor, str) and valor.strip() else None


@router.post("/bot/mensagens")
async def mensagens_do_teams(
    request: Request,
    settings: Annotated[Settings, Depends(obter_settings)],
    banco: Annotated[Banco, Depends(obter_banco)],
    verificador: Annotated[VerificadorTeams, Depends(obter_verificador)],
    conector: ConectorDep,
    authorization: Annotated[str | None, Header()] = None,
) -> Response:
    try:
        atividade: dict[str, Any] = await request.json()
    except (json.JSONDecodeError, UnicodeDecodeError) as erro:
        raise ErroApp("SEM_PERMISSAO", detalhe="bot: corpo inválido") from erro
    service_url = _texto(atividade.get("serviceUrl"))
    verificador.verificar(authorization, service_url)

    conversa = atividade.get("conversation") or {}
    de = atividade.get("from") or {}
    canal = atividade.get("channelData") or {}
    tenant = (canal.get("tenant") or {}).get("id") or conversa.get("tenantId")
    # Só conversas 1:1 com o bot, do tenant da DOMMA. Grupos e canais: ignora.
    if (
        conector is None
        or atividade.get("type") not in TIPOS_ACEITOS
        or conversa.get("conversationType") not in (None, "personal")
        or (tenant and tenant != settings.bot_tenant_id)
        or not (service_url and _texto(conversa.get("id")) and _texto(de.get("id")))
    ):
        return Response(status_code=200)

    usuario_id, conversa_id = de["id"], conversa["id"]
    async with banco.servico() as conn, conn.transaction():
        atual = await conn.fetchrow(SQL_CONVERSA_ATUAL, usuario_id)
        email, upn = (atual["email"], atual["upn"]) if atual else (None, None)
        aad = _texto(de.get("aadObjectId"))
        if not email and not upn:
            # E-mail de quem fala com o bot (API do Bot Framework): liga a conversa ao perfil da Central.
            try:
                membro = await conector.membro(service_url, conversa_id, usuario_id)
            except ErroTeams:
                membro = None
            if membro:
                email, upn, aad = membro.email, membro.upn, membro.aad_object_id or aad
        guardada = await conn.fetchrow(
            SQL_GUARDAR_CONVERSA, usuario_id, tenant, conversa_id, service_url, email, upn, aad
        )
        if atividade.get("type") != "message":
            return Response(status_code=200)

        recebido = _texto(atividade.get("text"))
        await conn.execute(
            """insert into public.bot_respostas_automaticas
                 (profile_id, teams_user_id, texto_recebido, chamado_referenciado)
               values ($1, $2, $3, $4)""",
            guardada["profile_id"],
            usuario_id,
            recebido[:4000] if recebido else None,
            guardada["ultimo_chamado_notificado"],
        )
        configurado = await conn.fetchval(
            "select valor from public.configuracoes where chave = 'bot_resposta_automatica'"
        )

    inicial = json.loads(configurado) if isinstance(configurado, str) else configurado
    resposta = resposta_automatica(
        _texto(inicial) or TEXTO_PADRAO,
        settings.web_origem.rstrip("/"),
        guardada["ultimo_chamado_notificado"],
    )
    try:
        await conector.enviar(service_url, conversa_id, resposta)
    except ErroTeams as erro:
        log.warning("resposta automática não enviada: %s", erro)
    return Response(status_code=200)
