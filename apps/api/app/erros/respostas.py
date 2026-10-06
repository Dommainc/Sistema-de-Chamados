"""Exemplos de erro para a documentação OpenAPI (/docs)."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from app.erros.catalogo import CodigoErro, mensagem_erro


class CorpoErro(BaseModel):
    codigo: str
    mensagem: str
    detalhe: str | None = None
    ref: str | None = None
    campos: list[dict[str, str]] | None = None


class RespostaErro(BaseModel):
    erro: CorpoErro


def _exemplo(codigo: CodigoErro, descricao: str, **parametros: str) -> dict[str, Any]:
    return {
        "model": RespostaErro,
        "description": descricao,
        "content": {
            "application/json": {
                "example": {
                    "erro": {"codigo": codigo, "mensagem": mensagem_erro(codigo, **parametros)}
                }
            }
        },
    }


RESPOSTAS_COM_LOGIN: dict[int | str, dict[str, Any]] = {
    401: _exemplo("SESSAO_EXPIRADA", "Token ausente, inválido ou expirado"),
    403: _exemplo("SEM_PERMISSAO", "Sem acesso (RLS ou perfil inativo)"),
    422: _exemplo("CAMPO_OBRIGATORIO", "Dados inválidos (lista `campos`)", campo="departamento"),
    500: _exemplo("ERRO_INESPERADO", "Erro inesperado (com `ref`)", ref="ERR-7F3A"),
}
