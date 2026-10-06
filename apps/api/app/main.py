"""API da Central de Chamados — DOMMA Incorporações. Documentação interativa em /docs."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import obter_settings
from app.db import banco
from app.erros.handlers import registrar_handlers
from app.routers import chamados, me, saude

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


@asynccontextmanager
async def ciclo_de_vida(_: FastAPI) -> AsyncIterator[None]:
    settings = obter_settings()
    if settings.database_url is not None:
        await banco.conectar(settings.database_url.get_secret_value())
    yield
    await banco.fechar()


def criar_app() -> FastAPI:
    settings = obter_settings()
    app = FastAPI(
        title="Central de Chamados — API",
        version="0.1.0",
        description="Ações de negócio da Central de Chamados. Erros sempre no formato "
        "`{ erro: { codigo, mensagem, detalhe?, campos?, ref? } }` (docs/erros.md).",
        lifespan=ciclo_de_vida,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.web_origem],
        allow_methods=["GET", "POST", "PATCH"],
        allow_headers=["Authorization", "Content-Type"],
    )
    registrar_handlers(app)
    app.include_router(saude.router)
    app.include_router(me.router)
    app.include_router(chamados.router)
    return app


app = criar_app()
