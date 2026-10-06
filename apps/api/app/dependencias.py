"""Dependências das rotas: unidade de trabalho (repositório numa transação) e Storage.

As rotas abrem a transação com `async with fabrica(usuario) as repo:` — assim a resposta só sai DEPOIS do
commit. Nos testes, as duas dependências são trocadas pelas versões em memória (docs/adr/0008).
"""

from __future__ import annotations

from collections.abc import AsyncIterator, Callable
from contextlib import AbstractAsyncContextManager, asynccontextmanager
from typing import Annotated

from fastapi import Depends

from app.auth import UsuarioAutenticado
from app.config import Settings, obter_settings
from app.db import Banco, obter_banco
from app.erros.catalogo import ErroApp
from app.integracoes.storage import Armazenamento, ArmazenamentoSupabase
from app.repositorios.base import Repositorio
from app.repositorios.postgres import RepositorioPostgres

FabricaRepositorio = Callable[[UsuarioAutenticado], AbstractAsyncContextManager[Repositorio]]


def obter_fabrica_repositorio(banco: Annotated[Banco, Depends(obter_banco)]) -> FabricaRepositorio:
    @asynccontextmanager
    async def abrir(usuario: UsuarioAutenticado) -> AsyncIterator[Repositorio]:
        async with banco.transacao(usuario) as transacao:
            yield RepositorioPostgres(transacao)

    return abrir


def obter_armazenamento(settings: Annotated[Settings, Depends(obter_settings)]) -> Armazenamento:
    if not settings.supabase_url or settings.supabase_service_role_key is None:
        raise ErroApp(
            "UPLOAD_FALHOU", detalhe="Storage não configurado (SUPABASE_URL/SERVICE_ROLE)"
        )
    return ArmazenamentoSupabase(
        settings.supabase_url, settings.supabase_service_role_key.get_secret_value()
    )


Fabrica = Annotated[FabricaRepositorio, Depends(obter_fabrica_repositorio)]
Storage = Annotated[Armazenamento, Depends(obter_armazenamento)]
