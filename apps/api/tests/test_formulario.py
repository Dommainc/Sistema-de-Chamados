"""Mesmos casos de apps/web/lib/dominio/formulario.test.ts."""

import pytest

from app.dominio.formulario import CampoForm, validar_formulario
from app.erros.catalogo import ErroApp


def campo(chave, tipo, obrigatorio=True, opcoes=None, ordem=10):
    return CampoForm(chave, f"Rótulo {chave}", tipo, obrigatorio, opcoes or [], ordem)


CAMPOS = [
    campo("alcance", "selecao", True, ["Só eu", "O escritório ou a obra inteira"], 10),
    campo("local", "texto", True, [], 20),
    campo("descricao", "texto_longo", True, [], 100),
    campo("patrimonio", "texto", False, [], 30),
]


def erro_de(fn) -> ErroApp:
    with pytest.raises(ErroApp) as erro:
        fn()
    return erro.value


def test_aceita_validas_apara_espacos_e_ignora_chaves_desconhecidas():
    r = validar_formulario(
        CAMPOS,
        "  Sem internet na obra  ",
        {
            "alcance": "O escritório ou a obra inteira",
            "local": " Obra Recreio ",
            "descricao": "Roteador piscando",
            "inventada": "x",
        },
    )
    assert r.titulo == "Sem internet na obra"
    assert r.respostas == {
        "alcance": "O escritório ou a obra inteira",
        "local": "Obra Recreio",
        "descricao": "Roteador piscando",
    }


def test_aponta_cada_obrigatorio_vazio_com_o_rotulo():
    erro = erro_de(lambda: validar_formulario(CAMPOS, "", {}))
    assert erro.codigo == "CAMPO_OBRIGATORIO"
    assert [c.campo for c in erro.campos] == ["titulo", "alcance", "local", "descricao"]
    assert erro.campos[0].mensagem == "Preencha o campo Resumo do problema para continuar."
    assert erro.campos[1].mensagem == "Preencha o campo Rótulo alcance para continuar."


def test_opcional_vazio_nao_da_erro():
    r = validar_formulario(
        CAMPOS,
        "Título ok",
        {"alcance": "Só eu", "local": "Sede", "descricao": "x", "patrimonio": ""},
    )
    assert "patrimonio" not in r.respostas


def test_opcao_fora_da_lista():
    erro = erro_de(
        lambda: validar_formulario(
            CAMPOS, "Título ok", {"alcance": "Talvez", "local": "a", "descricao": "b"}
        )
    )
    assert [c.campo for c in erro.campos] == ["alcance"]


def test_converte_numero_data_multipla_e_sim_nao():
    campos = [
        campo("qtd", "numero"),
        campo("inicio", "data"),
        campo("itens", "multipla_selecao", True, ["Mouse", "Monitor"]),
        campo("urgente", "sim_nao"),
    ]
    r = validar_formulario(
        campos,
        "Pedido",
        {"qtd": "2,5", "inicio": "2026-10-13", "itens": ["Monitor"], "urgente": "sim"},
    )
    assert r.respostas == {
        "qtd": 2.5,
        "inicio": "2026-10-13",
        "itens": ["Monitor"],
        "urgente": True,
    }


def test_recusa_numero_data_e_opcoes_invalidos():
    campos = [
        campo("qtd", "numero"),
        campo("inicio", "data"),
        campo("itens", "multipla_selecao", True, ["Mouse"]),
        campo("urgente", "sim_nao"),
    ]
    erro = erro_de(
        lambda: validar_formulario(
            campos,
            "Pedido",
            {"qtd": "dois", "inicio": "2026-02-30", "itens": ["Teclado"], "urgente": "talvez"},
        )
    )
    assert len(erro.campos) == 4


def test_nao_em_sim_nao_e_resposta_e_nao_campo_vazio():
    r = validar_formulario([campo("urgente", "sim_nao")], "Pedido", {"urgente": False})
    assert r.respostas["urgente"] is False
