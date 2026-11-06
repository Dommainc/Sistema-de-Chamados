"""Regras puras da tela de Configurações (app/dominio/configuracoes.py — ADR 0022)."""

import pytest

from app.dominio.configuracoes import (
    OpcaoEditada,
    comparar_opcoes,
    cores_da_lista,
    normalizar_opcoes,
    validar_expediente,
)
from app.erros.catalogo import ErroApp

ANTES = ["Sienge", "KickIn", "Mapfry", "Não se aplica"]
CORES = {
    "Sienge": "vermelho",
    "KickIn": "rosa",
    "Mapfry": "laranja-claro",
    "Não se aplica": "cinza",
}


def erro_de(fn) -> ErroApp:
    with pytest.raises(ErroApp) as erro:
        fn()
    return erro.value


def test_normaliza_espacos_e_recusa_repetida_ignorando_maiusculas():
    limpas = normalizar_opcoes([OpcaoEditada("  Sienge  ERP "), OpcaoEditada("Docusign")])
    assert [o.nome for o in limpas] == ["Sienge ERP", "Docusign"]
    erro = erro_de(lambda: normalizar_opcoes([OpcaoEditada("Sienge"), OpcaoEditada("sienge")]))
    assert erro.codigo == "NOME_DUPLICADO"
    assert erro.campos[0].campo == "opcoes.1"


def test_recusa_lista_vazia_nome_vazio_e_cor_fora_da_paleta():
    assert erro_de(lambda: normalizar_opcoes([])).codigo == "OPCOES_VAZIAS"
    assert erro_de(lambda: normalizar_opcoes([OpcaoEditada("  ")])).codigo == "CAMPO_OBRIGATORIO"
    assert (
        erro_de(lambda: normalizar_opcoes([OpcaoEditada("X", "fucsia")])).codigo
        == "CAMPO_OBRIGATORIO"
    )
    assert (
        erro_de(lambda: normalizar_opcoes([OpcaoEditada("x" * 81)])).codigo == "TEXTO_LONGO_DEMAIS"
    )


def test_compara_renomeia_tira_e_adiciona():
    depois = [
        OpcaoEditada("Sienge", "vermelho", "Sienge"),
        OpcaoEditada("Quickin", "rosa", "KickIn"),
        OpcaoEditada("Paytrack", "verde"),
        OpcaoEditada("Não se aplica", "cinza", "Não se aplica"),
    ]
    mudanca = comparar_opcoes(ANTES, CORES, depois)
    assert mudanca.adicionadas == ["Paytrack"]
    assert mudanca.removidas == ["Mapfry"]
    assert mudanca.renomeadas == {"KickIn": "Quickin"}
    assert not mudanca.cores_mudaram
    assert not mudanca.ordem_mudou
    assert mudanca.resumo("Qual sistema?") == (
        "Qual sistema?: + Paytrack · − Mapfry · KickIn → Quickin"
    )


def test_percebe_so_ordem_ou_so_cor_e_lista_igual():
    iguais = [OpcaoEditada(n, CORES[n], n) for n in ANTES]
    assert comparar_opcoes(ANTES, CORES, iguais).vazia
    trocadas = [iguais[1], iguais[0], *iguais[2:]]
    assert comparar_opcoes(ANTES, CORES, trocadas).ordem_mudou
    cor_nova = [OpcaoEditada("Sienge", "azul", "Sienge"), *iguais[1:]]
    mudanca = comparar_opcoes(ANTES, CORES, cor_nova)
    assert mudanca.cores_mudaram and not mudanca.ordem_mudou


def test_sem_antigo_mas_mesmo_nome_conta_como_mantida():
    depois = [OpcaoEditada(n, CORES[n]) for n in ANTES]
    assert comparar_opcoes(ANTES, CORES, depois).vazia
    assert cores_da_lista([OpcaoEditada("A", None), OpcaoEditada("B", "azul")]) == {"B": "azul"}


def test_expediente():
    assert validar_expediente("08:00", "20:00") == ("08:00", "20:00")
    assert erro_de(lambda: validar_expediente("20:00", "08:00")).codigo == "EXPEDIENTE_INVALIDO"
    assert erro_de(lambda: validar_expediente("08:00", "08:00")).codigo == "EXPEDIENTE_INVALIDO"
    assert erro_de(lambda: validar_expediente("8h", "20:00")).codigo == "CAMPO_OBRIGATORIO"
