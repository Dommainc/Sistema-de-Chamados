"""Perfil do usuário logado e sincronização do papel no login (etapa 1A-2)."""

from __future__ import annotations

import logging
from typing import Annotated

import asyncpg
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.auth import UsuarioAtual
from app.config import Settings, obter_settings
from app.db import Banco, Transacao, obter_banco
from app.dominio.papel import papel_pelos_grupos
from app.dominio.tipos import Papel
from app.erros.catalogo import ErroApp
from app.erros.respostas import RESPOSTAS_COM_LOGIN

log = logging.getLogger("central.me")
router = APIRouter(tags=["perfil"], responses=RESPOSTAS_COM_LOGIN)

_SQL_PERFIL = """
    select id, nome, email, departamento, telefone, papel, ativo
      from public.profiles
     where id = auth.uid()
"""


class Perfil(BaseModel):
    id: str
    nome: str
    email: str | None
    departamento: str | None
    telefone: str | None
    papel: Papel
    ativo: bool
    #: Departamento ainda não informado → o front leva para /primeiro-acesso.
    cadastro_pendente: bool


class PerfilAtualizacao(BaseModel):
    departamento: str = Field(min_length=2, max_length=100)
    telefone: str | None = Field(default=None, min_length=3, max_length=30)


def _perfil(linha: asyncpg.Record) -> Perfil:
    return Perfil(
        id=str(linha["id"]),
        nome=linha["nome"],
        email=linha["email"],
        departamento=linha["departamento"],
        telefone=linha["telefone"],
        papel=linha["papel"],
        ativo=linha["ativo"],
        cadastro_pendente=linha["departamento"] is None,
    )


async def _ler_perfil_ativo(t: Transacao) -> asyncpg.Record:
    """Lê o próprio perfil sob RLS. Inativo (desligado) → SEM_PERMISSAO."""
    await t.como_usuario()
    linha = await t.conn.fetchrow(_SQL_PERFIL)
    if linha is None or not linha["ativo"]:
        raise ErroApp("SEM_PERMISSAO", detalhe="perfil inexistente ou inativo")
    return linha


@router.get("/me", summary="Meu perfil e papel")
async def obter_me(usuario: UsuarioAtual, banco: Annotated[Banco, Depends(obter_banco)]) -> Perfil:
    async with banco.transacao(usuario) as t:
        return _perfil(await _ler_perfil_ativo(t))


@router.patch("/me", summary="Atualizar departamento e telefone (o papel nunca muda por aqui)")
async def atualizar_me(
    dados: PerfilAtualizacao,
    usuario: UsuarioAtual,
    banco: Annotated[Banco, Depends(obter_banco)],
) -> Perfil:
    async with banco.transacao(usuario) as t:
        await _ler_perfil_ativo(t)
        await t.como_api()
        linha = await t.conn.fetchrow(
            """
            update public.profiles
               set departamento = $2, telefone = $3
             where id = $1
         returning id, nome, email, departamento, telefone, papel, ativo
            """,
            usuario.id,
            dados.departamento.strip(),
            (dados.telefone or "").strip() or None,
        )
        return _perfil(linha)


@router.post(
    "/auth/sincronizar", summary="Chamado logo após o login: atualiza o papel pelo grupo do Entra"
)
async def sincronizar(
    usuario: UsuarioAtual,
    banco: Annotated[Banco, Depends(obter_banco)],
    settings: Annotated[Settings, Depends(obter_settings)],
) -> Perfil:
    async with banco.transacao(usuario) as t:
        atual = await _ler_perfil_ativo(t)
        papel: Papel = atual["papel"]
        if settings.ambiente != "dev":
            # Em dev o papel vem do seed.dev.sql; em dev/prod na nuvem, do grupo do Entra.
            pelos_grupos = papel_pelos_grupos(usuario.claims, settings.entra_grupo_ti_id)
            if pelos_grupos is None:
                log.warning(
                    "Login sem claim 'groups' (usuário %s): fica como solicitante", usuario.id
                )
            papel = pelos_grupos or "solicitante"
        await t.como_api()
        linha = await t.conn.fetchrow(
            """
            update public.profiles
               set papel = $2, ultimo_login_em = now()
             where id = $1
         returning id, nome, email, departamento, telefone, papel, ativo
            """,
            usuario.id,
            papel,
        )
        return _perfil(linha)
