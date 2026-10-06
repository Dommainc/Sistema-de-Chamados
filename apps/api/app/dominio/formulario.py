"""Validação do formulário dinâmico contra campos_form.

Espelho: apps/web/lib/dominio/formulario.ts. Erro em qualquer campo → CAMPO_OBRIGATORIO, com a lista
`campos` (chave + mensagem) para mostrar inline.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import date
from typing import Literal

from app.erros.catalogo import ErroApp, ErroDeCampo, mensagem_erro

TipoCampo = Literal[
    "texto", "texto_longo", "numero", "data", "selecao", "multipla_selecao", "sim_nao"
]
ValorResposta = str | list[str] | bool | float | int

#: Chave usada para o "Resumo do problema" (vira chamados.titulo).
CHAVE_TITULO = "titulo"
ROTULO_TITULO = "Resumo do problema"
TITULO_MAX = 200

_INVALIDO = object()


@dataclass(frozen=True)
class CampoForm:
    chave: str
    label: str
    tipo: TipoCampo
    obrigatorio: bool = False
    opcoes: list[str] = field(default_factory=list)
    ordem: int = 0


@dataclass(frozen=True)
class FormularioValidado:
    titulo: str
    respostas: dict[str, ValorResposta]


def _vazio(valor: object) -> bool:
    if valor is None:
        return True
    if isinstance(valor, str):
        return valor.strip() == ""
    return isinstance(valor, list) and len(valor) == 0


def _erro(chave: str, rotulo: str) -> ErroDeCampo:
    return ErroDeCampo(chave, mensagem_erro("CAMPO_OBRIGATORIO", campo=rotulo))


def _normalizar(campo: CampoForm, valor: object) -> object:
    """Converte o valor para o tipo do campo; _INVALIDO = valor inválido."""
    match campo.tipo:
        case "texto" | "texto_longo":
            return valor.strip() if isinstance(valor, str) else _INVALIDO
        case "numero":
            if isinstance(valor, bool):
                return _INVALIDO
            if isinstance(valor, int | float):
                numero = float(valor)
            else:
                try:
                    numero = float(str(valor).replace(",", "."))
                except ValueError:
                    return _INVALIDO
            if not math.isfinite(numero):
                return _INVALIDO
            return int(numero) if numero.is_integer() else numero
        case "data":
            if not isinstance(valor, str):
                return _INVALIDO
            try:
                return date.fromisoformat(valor).isoformat() if len(valor) == 10 else _INVALIDO
            except ValueError:
                return _INVALIDO
        case "selecao":
            return valor if isinstance(valor, str) and valor in campo.opcoes else _INVALIDO
        case "multipla_selecao":
            if isinstance(valor, list) and all(str(v) in campo.opcoes for v in valor):
                return [str(v) for v in valor]
            return _INVALIDO
        case "sim_nao":
            if isinstance(valor, bool):
                return valor
            return {"sim": True, "nao": False}.get(str(valor), _INVALIDO)


def validar_formulario(
    campos: list[CampoForm], titulo: str, respostas: dict[str, object]
) -> FormularioValidado:
    """Valida título + respostas. Ignora chaves que não são campos da categoria."""
    erros: list[ErroDeCampo] = []
    titulo_limpo = titulo.strip()
    if len(titulo_limpo) < 3:
        erros.append(_erro(CHAVE_TITULO, ROTULO_TITULO))

    validas: dict[str, ValorResposta] = {}
    for campo in sorted(campos, key=lambda c: c.ordem):
        bruto = respostas.get(campo.chave)
        if _vazio(bruto):
            if campo.obrigatorio:
                erros.append(_erro(campo.chave, campo.label))
            continue
        valor = _normalizar(campo, bruto)
        if valor is _INVALIDO:
            erros.append(_erro(campo.chave, campo.label))
            continue
        validas[campo.chave] = valor  # type: ignore[assignment]

    if erros:
        primeiro = erros[0].campo
        rotulo = (
            ROTULO_TITULO
            if primeiro == CHAVE_TITULO
            else next((c.label for c in campos if c.chave == primeiro), "")
        )
        raise ErroApp("CAMPO_OBRIGATORIO", {"campo": rotulo}, campos=erros)
    return FormularioValidado(titulo_limpo[:TITULO_MAX], validas)
