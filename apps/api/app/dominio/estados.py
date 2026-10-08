"""Máquina de estados do chamado — FONTE ÚNICA (CLAUDE.md, docs/adr/0005 e 0014, docs/status.md).

ADR 0014: sem aguardar usuário, retomar e devolver à fila. Aguardando usuário é só automático
(app.processar_inatividade, 2 h úteis) e volta sozinho quando o solicitante responde.

Espelho em TypeScript: apps/web/lib/dominio/estados.ts (modo simulado e botões do front).
Qualquer mudança aqui precisa ser feita lá também — os testes dos dois lados cobrem os mesmos casos.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from app.dominio.tipos import ROTULOS, Papel, StatusChamado, esta_encerrado
from app.erros.catalogo import ErroApp

AcaoChamado = Literal[
    "assumir",
    "resposta_solicitante",
    "transferir",
    "concluir",
    "cancelar",
]

TODAS_AS_ACOES: tuple[AcaoChamado, ...] = (
    "assumir",
    "resposta_solicitante",
    "transferir",
    "concluir",
    "cancelar",
)

DESTINO: dict[AcaoChamado, StatusChamado] = {
    "assumir": "em_andamento",
    "resposta_solicitante": "em_andamento",
    "transferir": "transferido",
    "concluir": "concluido",
    "cancelar": "cancelado",
}

#: De quais status cada ação parte.
ORIGENS: dict[AcaoChamado, frozenset[StatusChamado]] = {
    "assumir": frozenset({"pendente", "transferido"}),
    "resposta_solicitante": frozenset({"aguardando_usuario"}),
    "transferir": frozenset({"em_andamento", "aguardando_usuario"}),
    "concluir": frozenset({"em_andamento", "aguardando_usuario"}),
    "cancelar": frozenset({"pendente", "em_andamento", "aguardando_usuario", "transferido"}),
}


@dataclass(frozen=True)
class Ator:
    id: str
    papel: Papel


@dataclass(frozen=True)
class ChamadoParaTransicao:
    status: StatusChamado
    responsavel_id: str | None
    solicitante_id: str


@dataclass(frozen=True)
class DadosAcao:
    motivo: str | None = None
    #: Técnico de destino (transferir).
    destino_id: str | None = None


@dataclass(frozen=True)
class ResultadoTransicao:
    para: StatusChamado
    responsavel_id: str | None


def _exigir_motivo(dados: DadosAcao) -> None:
    if len((dados.motivo or "").strip()) < 3:
        raise ErroApp("MOTIVO_OBRIGATORIO")


def _transicao_invalida(de: StatusChamado, para: StatusChamado, papel: Papel) -> ErroApp:
    return ErroApp("TRANSICAO_INVALIDA", {"de": ROTULOS[papel][de], "para": ROTULOS[papel][para]})


def validar_acao(
    chamado: ChamadoParaTransicao,
    acao: AcaoChamado,
    ator: Ator,
    dados: DadosAcao | None = None,
) -> ResultadoTransicao:
    """Valida a ação e devolve o novo status e responsável.

    Lança ErroApp: TRANSICAO_INVALIDA, MOTIVO_OBRIGATORIO, CANCELAMENTO_NAO_PERMITIDO,
    SEM_PERMISSAO ou CAMPO_OBRIGATORIO.
    """
    dados = dados or DadosAcao()
    de = chamado.status
    para = DESTINO[acao]
    eh_ti = ator.papel == "ti"
    eh_dono = chamado.solicitante_id == ator.id

    # Quem pode tentar cada ação.
    if acao == "resposta_solicitante":
        if not eh_dono:
            raise ErroApp("SEM_PERMISSAO")
    elif acao == "cancelar":
        # Só a TI cancela (pedido do dono, 2026-10-07). O solicitante recebe a orientação do catálogo.
        if not eh_ti:
            raise ErroApp("CANCELAMENTO_NAO_PERMITIDO" if eh_dono else "SEM_PERMISSAO")
    elif not eh_ti:
        raise ErroApp("SEM_PERMISSAO")

    if esta_encerrado(de) or de not in ORIGENS[acao]:
        raise _transicao_invalida(de, para, ator.papel)

    if acao == "assumir":
        # Transferido: só o técnico de destino assume (os outros podem cancelar).
        if de == "transferido" and chamado.responsavel_id != ator.id:
            raise ErroApp("SEM_PERMISSAO")
        return ResultadoTransicao(para, ator.id)

    if acao == "transferir":
        destino = (dados.destino_id or "").strip()
        if not destino:
            raise ErroApp("CAMPO_OBRIGATORIO", {"campo": "Técnico de destino"})
        if destino == chamado.responsavel_id:
            raise _transicao_invalida(de, para, ator.papel)
        _exigir_motivo(dados)
        return ResultadoTransicao(para, destino)

    if acao == "cancelar":
        _exigir_motivo(dados)

    return ResultadoTransicao(para, chamado.responsavel_id)


def acoes_disponiveis(chamado: ChamadoParaTransicao, ator: Ator) -> list[AcaoChamado]:
    """Ações que o ator pode fazer agora (GET /chamados/{id}/acoes → botões do front)."""
    disponiveis: list[AcaoChamado] = []
    for acao in TODAS_AS_ACOES:
        if acao == "resposta_solicitante":
            continue  # automática, não é botão
        dados = DadosAcao(
            motivo="motivo válido",
            destino_id="__outro_tecnico__" if acao == "transferir" else None,
        )
        try:
            validar_acao(chamado, acao, ator, dados)
        except ErroApp:
            continue
        disponiveis.append(acao)
    return disponiveis
