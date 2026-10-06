"""Respostas de erro sempre no formato { "erro": { codigo, mensagem, detalhe?, campos? } }."""

from __future__ import annotations

import logging
from typing import Any

import asyncpg
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.config import obter_settings
from app.erros.catalogo import ErroApp, ErroDeCampo, mensagem_erro, traduzir_erro_banco

log = logging.getLogger("central.erros")


def corpo_erro(erro: ErroApp) -> dict[str, Any]:
    corpo: dict[str, Any] = {"codigo": erro.codigo, "mensagem": erro.mensagem}
    if erro.campos:
        corpo["campos"] = [{"campo": c.campo, "mensagem": c.mensagem} for c in erro.campos]
    if erro.ref:
        corpo["ref"] = erro.ref
    if erro.detalhe and obter_settings().ambiente == "dev":
        corpo["detalhe"] = erro.detalhe
    return {"erro": corpo}


def resposta(erro: ErroApp) -> JSONResponse:
    return JSONResponse(status_code=erro.status_http, content=corpo_erro(erro))


def _rotulo_do_campo(local: tuple[Any, ...]) -> str:
    """("body", "departamento") → "departamento"."""
    partes = [str(p) for p in local if p not in ("body", "query", "path")]
    return ".".join(partes) or "dados"


def registrar_handlers(app: FastAPI) -> None:
    @app.exception_handler(ErroApp)
    async def _erro_app(_: Request, erro: ErroApp) -> JSONResponse:
        if erro.codigo == "ERRO_INESPERADO":
            log.error("[%s] %s", erro.ref, erro.detalhe)
        return resposta(erro)

    @app.exception_handler(RequestValidationError)
    async def _validacao(_: Request, erro: RequestValidationError) -> JSONResponse:
        campos = []
        for item in erro.errors():
            campo = _rotulo_do_campo(tuple(item.get("loc", ())))
            campos.append(ErroDeCampo(campo, mensagem_erro("CAMPO_OBRIGATORIO", campo=campo)))
        primeiro = campos[0].campo if campos else "dados"
        return resposta(
            ErroApp(
                "CAMPO_OBRIGATORIO", {"campo": primeiro}, campos=campos, detalhe=str(erro.errors())
            )
        )

    @app.exception_handler(asyncpg.PostgresError)
    async def _banco(_: Request, erro: asyncpg.PostgresError) -> JSONResponse:
        traduzido = traduzir_erro_banco(
            getattr(erro, "sqlstate", None), getattr(erro, "constraint_name", None), str(erro)
        )
        if traduzido.codigo == "ERRO_INESPERADO":
            log.exception("[%s] erro do banco", traduzido.ref)
        return resposta(traduzido)

    @app.exception_handler(Exception)
    async def _inesperado(_: Request, erro: Exception) -> JSONResponse:
        traduzido = ErroApp("ERRO_INESPERADO", detalhe=f"{type(erro).__name__}: {erro}")
        log.exception("[%s] erro inesperado", traduzido.ref, exc_info=erro)
        return resposta(traduzido)
