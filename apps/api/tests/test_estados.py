"""Uma verificação por linha da tabela do CLAUDE.md (ADR 0005) + transições proibidas.

Mesmos casos de apps/web/lib/dominio/estados.test.ts (o front espelha esta regra).
"""

from collections.abc import Callable

import pytest

from app.dominio.estados import (
    Ator,
    ChamadoParaTransicao,
    DadosAcao,
    acoes_disponiveis,
    validar_acao,
)
from app.dominio.tipos import STATUS
from app.erros.catalogo import ErroApp

SOL = Ator("sol", "solicitante")
OUTRO_SOL = Ator("outro", "solicitante")
TEC = Ator("tec", "ti")
TEC2 = Ator("tec2", "ti")
MOTIVO = DadosAcao(motivo="Motivo de teste")


def chamado(status, responsavel=None):
    return ChamadoParaTransicao(status=status, responsavel_id=responsavel, solicitante_id=SOL.id)


def codigo(fn: Callable[[], object]) -> str | None:
    try:
        fn()
    except ErroApp as erro:
        return erro.codigo
    return None


# -------------------------------------------------------------------------- tabela de transições
def test_pendente_para_em_andamento_ti_assume_e_vira_responsavel():
    r = validar_acao(chamado("pendente"), "assumir", TEC)
    assert (r.para, r.responsavel_id) == ("em_andamento", TEC.id)


def test_so_a_ti_cancela_e_o_solicitante_recebe_a_orientacao():
    """Pedido do dono (2026-10-07): o solicitante não cancela mais, nem em pendente."""
    assert validar_acao(chamado("pendente"), "cancelar", TEC, MOTIVO).para == "cancelado"
    assert (
        codigo(lambda: validar_acao(chamado("pendente"), "cancelar", SOL, MOTIVO))
        == "CANCELAMENTO_NAO_PERMITIDO"
    )


def test_em_andamento_para_aguardando_usuario():
    r = validar_acao(chamado("em_andamento", TEC.id), "aguardar_usuario", TEC)
    assert r.para == "aguardando_usuario"


def test_aguardando_volta_para_em_andamento_por_resposta_ou_ti():
    r = validar_acao(chamado("aguardando_usuario", TEC.id), "resposta_solicitante", SOL)
    assert (r.para, r.responsavel_id) == ("em_andamento", TEC.id)
    assert validar_acao(chamado("aguardando_usuario", TEC.id), "retomar", TEC).para == (
        "em_andamento"
    )


@pytest.mark.parametrize("de", ["em_andamento", "aguardando_usuario"])
def test_transferir_com_destino_e_motivo(de):
    r = validar_acao(
        chamado(de, TEC.id), "transferir", TEC, DadosAcao(motivo="motivo ok", destino_id=TEC2.id)
    )
    assert (r.para, r.responsavel_id) == ("transferido", TEC2.id)


@pytest.mark.parametrize("de", ["em_andamento", "aguardando_usuario", "transferido"])
def test_devolver_a_fila_limpa_o_responsavel(de):
    r = validar_acao(chamado(de, TEC.id), "devolver_fila", TEC2, MOTIVO)
    assert (r.para, r.responsavel_id) == ("pendente", None)


def test_transferido_so_o_destino_assume_direto():
    assert validar_acao(chamado("transferido", TEC2.id), "assumir", TEC2).para == "em_andamento"
    assert codigo(lambda: validar_acao(chamado("transferido", TEC2.id), "assumir", TEC)) == (
        "SEM_PERMISSAO"
    )


@pytest.mark.parametrize("de", ["em_andamento", "aguardando_usuario"])
def test_concluir_inclusive_sem_resposta(de):
    assert validar_acao(chamado(de, TEC.id), "concluir", TEC).para == "concluido"


@pytest.mark.parametrize("de", ["em_andamento", "aguardando_usuario", "transferido"])
def test_ti_cancela_com_motivo(de):
    assert validar_acao(chamado(de, TEC.id), "cancelar", TEC, MOTIVO).para == "cancelado"


@pytest.mark.parametrize("de", ["concluido", "cancelado"])
def test_encerrados_sao_finais(de):
    for ator in (SOL, TEC):
        assert acoes_disponiveis(chamado(de, TEC.id), ator) == []
    assert codigo(lambda: validar_acao(chamado(de, TEC.id), "assumir", TEC)) == (
        "TRANSICAO_INVALIDA"
    )


# --------------------------------------------------------------------------- regras de exigência
def test_sem_motivo():
    assert (
        codigo(lambda: validar_acao(chamado("pendente"), "cancelar", TEC, DadosAcao(motivo=" ")))
        == "MOTIVO_OBRIGATORIO"
    )
    sem_motivo = DadosAcao(destino_id=TEC2.id)
    assert (
        codigo(lambda: validar_acao(chamado("em_andamento", TEC.id), "transferir", TEC, sem_motivo))
        == "MOTIVO_OBRIGATORIO"
    )
    assert (
        codigo(lambda: validar_acao(chamado("em_andamento", TEC.id), "devolver_fila", TEC))
        == "MOTIVO_OBRIGATORIO"
    )


def test_transferir_sem_destino_ou_para_o_mesmo_responsavel():
    em_andamento = chamado("em_andamento", TEC.id)
    assert codigo(lambda: validar_acao(em_andamento, "transferir", TEC, MOTIVO)) == (
        "CAMPO_OBRIGATORIO"
    )
    mesmo = DadosAcao(motivo="motivo ok", destino_id=TEC.id)
    assert codigo(lambda: validar_acao(em_andamento, "transferir", TEC, mesmo)) == (
        "TRANSICAO_INVALIDA"
    )


@pytest.mark.parametrize("de", ["em_andamento", "aguardando_usuario", "transferido"])
def test_solicitante_cancelando_depois_do_inicio(de):
    assert codigo(lambda: validar_acao(chamado(de, TEC.id), "cancelar", SOL, MOTIVO)) == (
        "CANCELAMENTO_NAO_PERMITIDO"
    )


@pytest.mark.parametrize(
    "acao",
    ["assumir", "aguardar_usuario", "retomar", "transferir", "devolver_fila", "concluir"],
)
def test_solicitante_nao_faz_acoes_da_ti(acao):
    dados = DadosAcao(motivo="motivo ok", destino_id=TEC2.id)
    assert codigo(lambda: validar_acao(chamado("em_andamento", TEC.id), acao, SOL, dados)) == (
        "SEM_PERMISSAO"
    )


def test_outro_solicitante_nao_cancela_nem_responde():
    assert codigo(lambda: validar_acao(chamado("pendente"), "cancelar", OUTRO_SOL, MOTIVO)) == (
        "SEM_PERMISSAO"
    )
    aguardando = chamado("aguardando_usuario", TEC.id)
    assert codigo(lambda: validar_acao(aguardando, "resposta_solicitante", OUTRO_SOL)) == (
        "SEM_PERMISSAO"
    )


def test_mensagem_de_transicao_invalida_usa_rotulos_do_perfil():
    with pytest.raises(ErroApp) as erro:
        validar_acao(chamado("concluido", TEC.id), "aguardar_usuario", TEC)
    assert erro.value.mensagem == "Não é possível mudar de Concluído para Aguardando usuário."


# ----------------------------------------------------------------------------- acoes_disponiveis
def test_solicitante_nao_tem_botoes_de_acao():
    for status in STATUS:
        assert acoes_disponiveis(chamado(status, TEC.id), SOL) == []


def test_ti_em_aguardando_usuario():
    assert sorted(acoes_disponiveis(chamado("aguardando_usuario", TEC.id), TEC)) == sorted(
        ["retomar", "transferir", "devolver_fila", "concluir", "cancelar"]
    )


def test_ti_que_nao_e_destino_de_um_transferido():
    assert sorted(acoes_disponiveis(chamado("transferido", TEC2.id), TEC)) == [
        "cancelar",
        "devolver_fila",
    ]
