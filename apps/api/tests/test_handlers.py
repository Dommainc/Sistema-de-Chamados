"""Formato dos erros: { erro: { codigo, mensagem, detalhe?, campos?, ref? } } (docs/erros.md)."""

import re

import asyncpg
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field

from app.erros.catalogo import ErroApp
from app.erros.handlers import registrar_handlers


class Dados(BaseModel):
    departamento: str = Field(min_length=2)


def cliente() -> TestClient:
    app = FastAPI()
    registrar_handlers(app)

    @app.get("/sem-permissao")
    def sem_permissao() -> None:
        raise ErroApp("SEM_PERMISSAO", detalhe="RLS bloqueou")

    @app.get("/quebrou")
    def quebrou() -> None:
        raise RuntimeError("segredo interno: senha=123")

    @app.get("/banco")
    def banco() -> None:
        raise asyncpg.exceptions.InsufficientPrivilegeError("permission denied for table chamados")

    @app.post("/validar")
    def validar(dados: Dados) -> Dados:
        return dados

    return TestClient(app, raise_server_exceptions=False)


def test_erro_do_catalogo_com_status_http(ambiente):
    ambiente("prod")
    resposta = cliente().get("/sem-permissao")
    assert resposta.status_code == 403
    assert resposta.json() == {
        "erro": {
            "codigo": "SEM_PERMISSAO",
            "mensagem": (
                "Você não tem acesso a este chamado. Se acha que isso é um erro, fale com a TI."
            ),
        }
    }


def test_detalhe_so_aparece_em_dev(ambiente):
    ambiente("dev")
    assert cliente().get("/sem-permissao").json()["erro"]["detalhe"] == "RLS bloqueou"
    ambiente("prod")
    assert "detalhe" not in cliente().get("/sem-permissao").json()["erro"]


def test_excecao_inesperada_vira_erro_com_ref_e_nao_vaza_nada(ambiente):
    ambiente("prod")
    resposta = cliente().get("/quebrou")
    corpo = resposta.json()["erro"]
    assert resposta.status_code == 500
    assert corpo["codigo"] == "ERRO_INESPERADO"
    assert re.fullmatch(r"ERR-[0-9A-F]{4}", corpo["ref"])
    assert corpo["ref"] in corpo["mensagem"]
    assert "senha" not in resposta.text


def test_erro_do_postgres_vira_catalogo(ambiente):
    ambiente("prod")
    resposta = cliente().get("/banco")
    assert resposta.status_code == 403
    assert resposta.json()["erro"]["codigo"] == "SEM_PERMISSAO"
    assert "permission denied" not in resposta.text


def test_validacao_vira_campo_obrigatorio_por_campo(ambiente):
    ambiente("prod")
    resposta = cliente().post("/validar", json={"departamento": "x"})
    corpo = resposta.json()["erro"]
    assert resposta.status_code == 422
    assert corpo["codigo"] == "CAMPO_OBRIGATORIO"
    assert corpo["campos"] == [
        {"campo": "departamento", "mensagem": "Preencha o campo departamento para continuar."}
    ]
