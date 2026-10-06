"""Banco: "lê como o usuário, grava como central_api" numa única transação (docs/adr/0002).

    async with banco.transacao(usuario) as t:
        await t.como_usuario()          # set local role authenticated + claims do JWT → RLS vale
        chamado = await t.conn.fetchrow("select ... from chamados where id = $1", id)
        if chamado is None: raise ErroApp("SEM_PERMISSAO")
        await t.como_api()              # reset role → grava como central_api
        await t.conn.execute("update chamados ...")

Erros do Postgres são traduzidos pelo handler (app/erros/handlers.py → catálogo).
"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import asyncpg

from app.auth import UsuarioAutenticado
from app.erros.catalogo import ErroApp


class Transacao:
    def __init__(self, conn: asyncpg.Connection, usuario: UsuarioAutenticado) -> None:
        self.conn = conn
        self._usuario = usuario

    async def como_usuario(self) -> None:
        """Passa a ler com o RLS do usuário (o mesmo que o front usa)."""
        await self.conn.execute("set local role authenticated")
        await self.conn.execute(
            "select set_config('request.jwt.claims', $1, true)", json.dumps(self._usuario.claims)
        )

    async def como_api(self) -> None:
        """Volta ao papel da conexão (central_api) para gravar."""
        await self.conn.execute("reset role")


class Banco:
    def __init__(self) -> None:
        self._pool: asyncpg.Pool | None = None

    @property
    def conectado(self) -> bool:
        return self._pool is not None

    async def conectar(self, dsn: str) -> None:
        # statement_cache_size=0: compatível com o Supavisor em modo transaction (porta 6543).
        self._pool = await asyncpg.create_pool(
            dsn, statement_cache_size=0, min_size=0, max_size=5, command_timeout=10
        )

    async def fechar(self) -> None:
        if self._pool is not None:
            await self._pool.close()
            self._pool = None

    async def esta_respondendo(self) -> bool:
        if self._pool is None:
            return False
        try:
            async with self._pool.acquire() as conn:
                return await conn.fetchval("select 1") == 1
        except (OSError, asyncpg.PostgresError):
            return False

    @asynccontextmanager
    async def transacao(self, usuario: UsuarioAutenticado) -> AsyncIterator[Transacao]:
        if self._pool is None:
            raise ErroApp("ERRO_INESPERADO", detalhe="banco não configurado (DATABASE_URL)")
        async with self._pool.acquire() as conn, conn.transaction():
            yield Transacao(conn, usuario)


banco = Banco()


def obter_banco() -> Banco:
    return banco
