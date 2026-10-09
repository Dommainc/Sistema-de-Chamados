"""Repositório Postgres (docs/adr/0002 e 0008): lê como o usuário (RLS), grava como central_api.

Todos os métodos rodam na MESMA transação (`Transacao` de app/db.py): se qualquer gravação falhar,
nada fica pela metade (chamado + histórico + notificação). Erros do Postgres viram catálogo no handler.
ATENÇÃO: escrito antes de existir banco — validar com os testes de integração (pendencias.md P-034).
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

import asyncpg

from app.db import Transacao
from app.dominio.formulario import CampoForm
from app.dominio.tipos import StatusChamado
from app.repositorios.base import (
    AnexoLinha,
    AvaliacaoLinha,
    CategoriaLinha,
    ChamadoLinha,
    MensagemCriada,
    NovaNotificacao,
    NovaTransferencia,
    NovoAnexo,
    NovoEvento,
    PerfilLinha,
)

_COLUNAS_CHAMADO = """
    id, titulo, categoria_id, area_id, solicitante_id, responsavel_id, status::text as status,
    prioridade::text as prioridade,
    prazo_sla, criado_em, atualizado_em, concluido_em, cancelado_em, motivo_cancelamento,
    respostas_form
"""


def _chamado(linha: asyncpg.Record) -> ChamadoLinha:
    respostas = linha["respostas_form"]
    return ChamadoLinha(
        id=linha["id"],
        titulo=linha["titulo"],
        categoria_id=linha["categoria_id"],
        area_id=linha["area_id"],
        solicitante_id=str(linha["solicitante_id"]),
        responsavel_id=str(linha["responsavel_id"]) if linha["responsavel_id"] else None,
        status=linha["status"],
        prioridade=linha["prioridade"],
        prazo_sla=linha["prazo_sla"],
        criado_em=linha["criado_em"],
        atualizado_em=linha["atualizado_em"],
        concluido_em=linha["concluido_em"],
        cancelado_em=linha["cancelado_em"],
        motivo_cancelamento=linha["motivo_cancelamento"],
        respostas_form=json.loads(respostas) if isinstance(respostas, str) else dict(respostas),
    )


def _anexo(linha: asyncpg.Record) -> AnexoLinha:
    return AnexoLinha(
        id=str(linha["id"]),
        chamado_id=linha["chamado_id"],
        mensagem_id=linha["mensagem_id"],
        path=linha["path"],
        nome=linha["nome"],
        mime=linha["mime"],
        tamanho=linha["tamanho"],
    )


class RepositorioPostgres:
    def __init__(self, transacao: Transacao) -> None:
        self._t = transacao

    @property
    def _c(self) -> asyncpg.Connection:
        return self._t.conn

    # ------------------------------------------------------------------ leituras (sob RLS)
    async def obter_meu_perfil(self) -> PerfilLinha | None:
        await self._t.como_usuario()
        linha = await self._c.fetchrow(
            "select id, nome, papel::text as papel, ativo from public.profiles where id = auth.uid()"
        )
        if linha is None:
            return None
        return PerfilLinha(str(linha["id"]), linha["nome"], linha["papel"], linha["ativo"])

    async def obter_chamado(self, chamado_id: int) -> ChamadoLinha | None:
        await self._t.como_usuario()
        linha = await self._c.fetchrow(
            f"select {_COLUNAS_CHAMADO} from public.chamados where id = $1", chamado_id
        )
        return _chamado(linha) if linha else None

    async def obter_anexo(self, anexo_id: str) -> AnexoLinha | None:
        await self._t.como_usuario()
        linha = await self._c.fetchrow(
            "select id, chamado_id, mensagem_id, path, nome, mime, tamanho "
            "from public.anexos where id = $1::uuid",
            anexo_id,
        )
        return _anexo(linha) if linha else None

    async def ultima_mensagem_visivel_em(self, chamado_id: int) -> datetime | None:
        await self._t.como_usuario()
        return await self._c.fetchval(
            "select max(criado_em) from public.mensagens where chamado_id = $1", chamado_id
        )

    async def obter_avaliacao(self, chamado_id: int) -> AvaliacaoLinha | None:
        await self._t.como_usuario()
        linha = await self._c.fetchrow(
            "select chamado_id, avaliador_id::text, nota, comentario, criado_em "
            "from public.avaliacoes where chamado_id = $1",
            chamado_id,
        )
        return AvaliacaoLinha(**dict(linha)) if linha else None

    # ------------------------------------------------------------------ apoio (como a API)
    async def obter_categoria_ativa(self, categoria_id: int) -> CategoriaLinha | None:
        await self._t.como_api()
        linha = await self._c.fetchrow(
            "select id, nome, sla_horas, area_id from public.categorias where id = $1 and ativo",
            categoria_id,
        )
        if linha is None:
            return None
        return CategoriaLinha(
            linha["id"], linha["nome"], float(linha["sla_horas"]), linha["area_id"]
        )

    async def listar_campos_form(self, categoria_id: int) -> list[CampoForm]:
        await self._t.como_api()
        linhas = await self._c.fetch(
            """
            select chave, label, tipo::text as tipo, obrigatorio, opcoes, ordem
              from public.campos_form
             where categoria_id = $1 and ativo
             order by ordem
            """,
            categoria_id,
        )
        return [
            CampoForm(
                chave=linha["chave"],
                label=linha["label"],
                tipo=linha["tipo"],
                obrigatorio=linha["obrigatorio"],
                opcoes=json.loads(linha["opcoes"])
                if isinstance(linha["opcoes"], str)
                else list(linha["opcoes"]),
                ordem=linha["ordem"],
            )
            for linha in linhas
        ]

    async def agora(self) -> datetime:
        return await self._c.fetchval("select now()")

    async def listar_tecnicos_ativos(self) -> list[str]:
        await self._t.como_api()
        linhas = await self._c.fetch(
            "select id from public.profiles where papel = 'ti' and ativo order by nome"
        )
        return [str(linha["id"]) for linha in linhas]

    # ------------------------------------------------------------------ gravações (central_api)
    async def inserir_chamado(
        self, titulo: str, categoria_id: int, solicitante_id: str, respostas: dict[str, Any]
    ) -> ChamadoLinha:
        await self._t.como_api()
        # Área e datas vêm do trigger app.chamados_antes_inserir; o prazo nasce vazio (ADR 0009).
        linha = await self._c.fetchrow(
            f"""
            insert into public.chamados (titulo, categoria_id, solicitante_id, respostas_form)
            values ($1, $2, $3::uuid, $4::jsonb)
            returning {_COLUNAS_CHAMADO}
            """,
            titulo,
            categoria_id,
            solicitante_id,
            json.dumps(respostas),
        )
        return _chamado(linha)

    async def atualizar_chamado(
        self,
        chamado_id: int,
        status: StatusChamado,
        responsavel_id: str | None,
        motivo_cancelamento: str | None,
    ) -> ChamadoLinha:
        await self._t.como_api()
        # concluido_em / cancelado_em são carimbados pelo trigger app.chamados_antes_atualizar.
        linha = await self._c.fetchrow(
            f"""
            update public.chamados
               set status = $2::public.status_chamado,
                   responsavel_id = $3::uuid,
                   motivo_cancelamento = coalesce($4, motivo_cancelamento)
             where id = $1
         returning {_COLUNAS_CHAMADO}
            """,
            chamado_id,
            status,
            responsavel_id,
            motivo_cancelamento,
        )
        return _chamado(linha)

    async def definir_prioridade(self, chamado_id: int, prioridade: str) -> ChamadoLinha:
        await self._t.como_api()
        linha = await self._c.fetchrow(
            f"""
            update public.chamados set prioridade = $2::public.prioridade where id = $1
            returning {_COLUNAS_CHAMADO}
            """,
            chamado_id,
            prioridade,
        )
        return _chamado(linha)

    async def definir_prazo(self, chamado_id: int, prazo: datetime) -> ChamadoLinha:
        await self._t.como_api()
        linha = await self._c.fetchrow(
            f"update public.chamados set prazo_sla = $2 where id = $1 returning {_COLUNAS_CHAMADO}",
            chamado_id,
            prazo,
        )
        return _chamado(linha)

    async def inserir_mensagem(
        self, chamado_id: int, autor_id: str, conteudo: str, interna: bool
    ) -> MensagemCriada:
        await self._t.como_api()
        linha = await self._c.fetchrow(
            """
            insert into public.mensagens (chamado_id, autor_id, conteudo, interna)
            values ($1, $2::uuid, $3, $4)
            returning id, criado_em
            """,
            chamado_id,
            autor_id,
            conteudo,
            interna,
        )
        return MensagemCriada(linha["id"], linha["criado_em"])

    async def inserir_anexos(self, anexos: list[NovoAnexo]) -> list[AnexoLinha]:
        await self._t.como_api()
        resultado = []
        for a in anexos:
            linha = await self._c.fetchrow(
                """
                insert into public.anexos
                       (chamado_id, mensagem_id, path, nome, mime, tamanho, origem, enviado_por)
                values ($1, $2, $3, $4, $5, $6, $7::public.origem_anexo, $8::uuid)
                returning id, chamado_id, mensagem_id, path, nome, mime, tamanho
                """,
                a.chamado_id,
                a.mensagem_id,
                a.path,
                a.nome,
                a.mime,
                a.tamanho,
                a.origem,
                a.enviado_por,
            )
            resultado.append(_anexo(linha))
        return resultado

    async def inserir_eventos(self, eventos: list[NovoEvento]) -> None:
        await self._t.como_api()
        await self._c.executemany(
            """
            insert into public.historico (chamado_id, autor_id, acao, de, para, detalhe, publico)
            values ($1, $2::uuid, $3, $4, $5, $6::jsonb, $7)
            """,
            [
                (e.chamado_id, e.autor_id, e.acao, e.de, e.para, json.dumps(e.detalhe), e.publico)
                for e in eventos
            ],
        )

    async def inserir_avaliacao(
        self, chamado_id: int, avaliador_id: str, nota: int, comentario: str | None
    ) -> AvaliacaoLinha:
        await self._t.como_api()
        linha = await self._c.fetchrow(
            """
            insert into public.avaliacoes (chamado_id, avaliador_id, nota, comentario)
            values ($1, $2::uuid, $3, $4)
            returning chamado_id, avaliador_id::text, nota, comentario, criado_em
            """,
            chamado_id,
            avaliador_id,
            nota,
            comentario,
        )
        return AvaliacaoLinha(**dict(linha))

    async def inserir_transferencia(self, transferencia: NovaTransferencia) -> None:
        await self._t.como_api()
        t = transferencia
        await self._c.execute(
            """
            insert into public.transferencias
                   (chamado_id, de_responsavel_id, para_responsavel_id, de_area_id, para_area_id,
                    motivo, autor_id)
            values ($1, $2::uuid, $3::uuid, $4, $4, $5, $6::uuid)
            """,
            t.chamado_id,
            t.de_responsavel_id,
            t.para_responsavel_id,
            t.area_id,
            t.motivo,
            t.autor_id,
        )

    async def inserir_notificacoes(self, notificacoes: list[NovaNotificacao]) -> None:
        if not notificacoes:
            return
        await self._t.como_api()
        await self._c.executemany(
            """
            insert into public.notificacoes (chamado_id, destinatario_id, tipo, payload)
            values ($1, $2::uuid, $3, $4::jsonb)
            """,
            [
                (n.chamado_id, n.destinatario_id, n.tipo, json.dumps(n.payload))
                for n in notificacoes
            ],
        )

    async def marcar_lido(self, chamado_id: int, perfil_id: str, lido_ate: datetime) -> None:
        await self._t.como_api()
        await self._c.execute(
            """
            insert into public.chamado_leituras (chamado_id, profile_id, lido_ate)
            values ($1, $2::uuid, $3)
            on conflict (chamado_id, profile_id)
            do update set lido_ate = greatest(excluded.lido_ate, public.chamado_leituras.lido_ate)
            """,
            chamado_id,
            perfil_id,
            lido_ate,
        )
