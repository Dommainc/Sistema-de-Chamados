"""Regras da tela de Configurações (docs/adr/0022). Espelho de apps/web/lib/dominio/configuracoes.ts.

Funções puras (sem banco): validam o que a TI digitou e montam o resumo do registro de alterações.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.erros.catalogo import CodigoErro, ErroApp, ErroDeCampo, mensagem_erro

#: Paleta fixa das cores de opção (app.cores_validas — migration 0030; CORES_PALETA no front).
CORES_PALETA: frozenset[str] = frozenset(
    {
        "vermelho", "vermelho-claro", "vermelho-escuro", "verde-claro", "azul-claro", "azul-escuro",
        "roxo", "cinza", "verde", "verde-escuro", "verde-agua", "oliva",
        "azul", "indigo", "magenta", "marrom", "grafite", "laranja",
        "mostarda", "ciano", "lilas", "rosa", "laranja-claro", "areia",
        "amarelo",
    }
)  # fmt: skip

#: Ícones que a tela inicial sabe desenhar (components/ui/IconeCategoria.tsx).
ICONES_ASSUNTO: tuple[str, ...] = (
    "key-round", "wifi", "mail", "message-square", "laptop", "printer", "smartphone",
    "layout-grid", "grid-2x2", "app-window", "cctv", "download", "user-plus", "user-minus",
    "package", "ellipsis",
)  # fmt: skip

MAX_NOME_OPCAO = 80
_HORA = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


@dataclass(frozen=True)
class OpcaoEditada:
    """Uma linha da lista editada na tela. `antigo` = nome que ela tinha (renomear); None = nova."""

    nome: str
    cor: str | None = None
    antigo: str | None = None


@dataclass
class MudancaOpcoes:
    adicionadas: list[str] = field(default_factory=list)
    removidas: list[str] = field(default_factory=list)
    #: antigo → novo
    renomeadas: dict[str, str] = field(default_factory=dict)
    cores_mudaram: bool = False
    ordem_mudou: bool = False

    @property
    def vazia(self) -> bool:
        return not (
            self.adicionadas
            or self.removidas
            or self.renomeadas
            or self.cores_mudaram
            or self.ordem_mudou
        )

    def resumo(self, rotulo_campo: str) -> str:
        """'Qual sistema?: + Quickin · − Mapfry · KickIn → Quickin · cores · ordem'."""
        partes = [f"+ {n}" for n in self.adicionadas]
        partes += [f"− {n}" for n in self.removidas]
        partes += [f"{a} → {n}" for a, n in self.renomeadas.items()]
        if self.cores_mudaram:
            partes.append("cores")
        if self.ordem_mudou:
            partes.append("ordem")
        return f"{rotulo_campo}: {' · '.join(partes)}"[:500]


def _erro_campo(codigo: CodigoErro, onde: str, **parametros: str) -> ErroApp:
    """Erro com o campo da tela que deve ficar marcado (`onde`, ex.: "opcoes.3")."""
    return ErroApp(
        codigo, parametros, campos=[ErroDeCampo(onde, mensagem_erro(codigo, **parametros))]
    )


def normalizar_opcoes(opcoes: list[OpcaoEditada]) -> list[OpcaoEditada]:
    """Apara espaços e confere: ao menos uma, sem nome vazio, sem repetir (ignorando maiúsculas)."""
    if not opcoes:
        raise ErroApp("OPCOES_VAZIAS")
    vistas: set[str] = set()
    limpas: list[OpcaoEditada] = []
    for i, opcao in enumerate(opcoes):
        nome = " ".join(opcao.nome.split())
        if not nome:
            raise _erro_campo("CAMPO_OBRIGATORIO", f"opcoes.{i}", campo="Nome da opção")
        if len(nome) > MAX_NOME_OPCAO:
            raise _erro_campo(
                "TEXTO_LONGO_DEMAIS", f"opcoes.{i}", campo=nome[:20], maximo=str(MAX_NOME_OPCAO)
            )
        if nome.casefold() in vistas:
            raise _erro_campo("NOME_DUPLICADO", f"opcoes.{i}", campo=nome)
        if opcao.cor is not None and opcao.cor not in CORES_PALETA:
            raise _erro_campo("CAMPO_OBRIGATORIO", f"opcoes.{i}", campo="Cor")
        vistas.add(nome.casefold())
        limpas.append(OpcaoEditada(nome, opcao.cor, opcao.antigo))
    return limpas


def comparar_opcoes(
    antes: list[str], cores_antes: dict[str, str], depois: list[OpcaoEditada]
) -> MudancaOpcoes:
    """O que mudou entre a lista do banco e a editada (para o resumo e para seguir as perguntas)."""
    mudanca = MudancaOpcoes()
    conhecidas = set(antes)
    origens: list[str] = []  # nome antigo de cada opção mantida, na ordem nova
    for opcao in depois:
        origem = opcao.antigo if opcao.antigo in conhecidas else None
        if origem is None and opcao.nome in conhecidas:
            origem = opcao.nome
        if origem is None or origem in origens:
            mudanca.adicionadas.append(opcao.nome)
            continue
        origens.append(origem)
        if origem != opcao.nome:
            mudanca.renomeadas[origem] = opcao.nome
        if cores_antes.get(origem) != opcao.cor:
            mudanca.cores_mudaram = True
    mudanca.removidas = [n for n in antes if n not in origens]
    mudanca.ordem_mudou = [n for n in antes if n in origens] != origens
    return mudanca


def cores_da_lista(opcoes: list[OpcaoEditada]) -> dict[str, str]:
    return {o.nome: o.cor for o in opcoes if o.cor is not None}


def validar_expediente(inicio: str, fim: str) -> tuple[str, str]:
    """'08:00' e '20:00' → iguais; formato HH:MM e fim depois do início."""
    for valor, campo in ((inicio, "inicio"), (fim, "fim")):
        if not _HORA.match(valor):
            raise _erro_campo("CAMPO_OBRIGATORIO", campo, campo="Horário")
    if fim <= inicio:
        raise _erro_campo("EXPEDIENTE_INVALIDO", "fim")
    return inicio, fim


def texto_limpo(valor: str) -> str:
    return " ".join(valor.split())
