"""Catálogo central de erros (docs/erros.md). Espelho de apps/web/lib/erros/catalogo.ts.

Nunca devolver ao usuário mensagem crua do Postgres/Supabase ou stack trace: tudo passa por aqui.
"""

from __future__ import annotations

import re
import secrets
from dataclasses import dataclass, field
from typing import Literal

CodigoErro = Literal[
    "CAMPO_OBRIGATORIO",
    "ANEXO_MUITO_GRANDE",
    "ANEXO_TIPO_INVALIDO",
    "COLAR_SEM_IMAGEM",
    "UPLOAD_FALHOU",
    "SESSAO_EXPIRADA",
    "SEM_PERMISSAO",
    "CHAMADO_NAO_ENCONTRADO",
    "TRANSICAO_INVALIDA",
    "MOTIVO_OBRIGATORIO",
    "CANCELAMENTO_NAO_PERMITIDO",
    "PRAZO_INVALIDO",
    "MENSAGEM_NAO_ENVIADA",
    "SEM_CONEXAO",
    "ERRO_INESPERADO",
]

CATALOGO: dict[CodigoErro, str] = {
    "CAMPO_OBRIGATORIO": "Preencha o campo {campo} para continuar.",
    "ANEXO_MUITO_GRANDE": (
        "Esse arquivo tem mais de 10 MB. Tente um arquivo menor ou envie um print da tela."
    ),
    "ANEXO_TIPO_INVALIDO": (
        "Esse tipo de arquivo não é aceito. Envie imagem, PDF ou documento do Office."
    ),
    "COLAR_SEM_IMAGEM": "Não encontramos uma imagem para colar. Copie o print e tente de novo.",
    "UPLOAD_FALHOU": "Não conseguimos enviar o arquivo. Verifique sua conexão e tente novamente.",
    "SESSAO_EXPIRADA": "Sua sessão expirou. Entre novamente com sua conta Microsoft.",
    "SEM_PERMISSAO": (
        "Você não tem acesso a este chamado. Se acha que isso é um erro, fale com a TI."
    ),
    "CHAMADO_NAO_ENCONTRADO": (
        "Não encontramos o chamado #{numero}. Confira o número e tente de novo."
    ),
    "TRANSICAO_INVALIDA": "Não é possível mudar de {de} para {para}.",
    "MOTIVO_OBRIGATORIO": "Informe o motivo para continuar.",
    "CANCELAMENTO_NAO_PERMITIDO": (
        "Esse chamado já está sendo atendido. Para cancelar, fale com a TI pelo chat."
    ),
    "PRAZO_INVALIDO": "Escolha uma data e hora no futuro para o prazo.",
    "MENSAGEM_NAO_ENVIADA": "Sua mensagem não foi enviada. Toque para tentar de novo.",
    "SEM_CONEXAO": "Sem conexão. As mensagens novas vão aparecer quando a conexão voltar.",
    "ERRO_INESPERADO": (
        "Algo deu errado do nosso lado. Tente novamente. Se continuar, informe o código "
        "{ref} para a TI."
    ),
}

STATUS_HTTP: dict[CodigoErro, int] = {
    "CAMPO_OBRIGATORIO": 422,
    "ANEXO_MUITO_GRANDE": 422,
    "ANEXO_TIPO_INVALIDO": 422,
    "COLAR_SEM_IMAGEM": 422,
    "UPLOAD_FALHOU": 502,
    "SESSAO_EXPIRADA": 401,
    "SEM_PERMISSAO": 403,
    "CHAMADO_NAO_ENCONTRADO": 404,
    "TRANSICAO_INVALIDA": 409,
    "MOTIVO_OBRIGATORIO": 422,
    "CANCELAMENTO_NAO_PERMITIDO": 409,
    "PRAZO_INVALIDO": 422,
    "MENSAGEM_NAO_ENVIADA": 503,
    "SEM_CONEXAO": 503,
    "ERRO_INESPERADO": 500,
}

_PLACEHOLDER = re.compile(r"\{(\w+)\}")


def mensagem_erro(codigo: CodigoErro, **parametros: str) -> str:
    """Texto do catálogo com os placeholders preenchidos.

    Placeholders: {campo}, {numero}, {de}, {para}, {ref}.
    """
    return _PLACEHOLDER.sub(lambda m: parametros.get(m.group(1), ""), CATALOGO[codigo])


def gerar_ref_erro() -> str:
    """Referência curta para erro inesperado: "ERR-7F3A"."""
    return f"ERR-{secrets.token_hex(2).upper()}"


@dataclass(frozen=True)
class ErroDeCampo:
    campo: str
    mensagem: str


@dataclass
class ErroApp(Exception):
    """Erro já traduzido pelo catálogo. É o único tipo de erro que chega ao usuário."""

    codigo: CodigoErro
    parametros: dict[str, str] = field(default_factory=dict)
    campos: list[ErroDeCampo] = field(default_factory=list)
    #: Informação técnica; só é devolvida quando AMBIENTE=dev.
    detalhe: str | None = None
    ref: str | None = None

    def __post_init__(self) -> None:
        if self.codigo == "ERRO_INESPERADO" and self.ref is None:
            self.ref = self.parametros.get("ref") or gerar_ref_erro()
        super().__init__(self.mensagem)

    @property
    def mensagem(self) -> str:
        parametros = {**self.parametros, **({"ref": self.ref} if self.ref else {})}
        return mensagem_erro(self.codigo, **parametros)

    @property
    def status_http(self) -> int:
        return STATUS_HTTP[self.codigo]


# --------------------------------------------------------------------------------------------
# Erros do banco (SQLSTATE próprios das migrations) → catálogo (CLAUDE.md, "Erros do banco")
# --------------------------------------------------------------------------------------------

_SQLSTATE: dict[str, CodigoErro] = {
    "CC001": "TRANSICAO_INVALIDA",  # encerrado é somente leitura
    "CC005": "SEM_PERMISSAO",  # ex.: nota interna de solicitante
    "42501": "SEM_PERMISSAO",  # permissão negada
}

#: Regras (check constraints) com tradução própria; as demais viram ERRO_INESPERADO.
_CONSTRAINTS: dict[str, CodigoErro] = {
    "chamados_cancelado_exige_motivo": "MOTIVO_OBRIGATORIO",
}


def traduzir_erro_banco(sqlstate: str | None, constraint: str | None, texto: str) -> ErroApp:
    """Converte um erro do Postgres num ErroApp, guardando o texto original só como detalhe."""
    if sqlstate == "23514" and constraint in _CONSTRAINTS:
        return ErroApp(_CONSTRAINTS[constraint], detalhe=texto)
    codigo = _SQLSTATE.get(sqlstate or "")
    if codigo == "TRANSICAO_INVALIDA":
        # O banco não sabe os rótulos; a API valida a transição antes, então isto é raro.
        return ErroApp(codigo, {"de": "encerrado", "para": "outro status"}, detalhe=texto)
    if codigo:
        return ErroApp(codigo, detalhe=texto)
    return ErroApp("ERRO_INESPERADO", detalhe=f"[{sqlstate}] {texto}")
