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


# ---------------------------------------------------------------- pergunta condicional (migration 0031)
SISTEMA = CampoForm("sistema", "Qual sistema?", "selecao", True, ["Sienge", "CVCRM", "Outro"], 10)
MODULO = CampoForm(
    "modulo_sienge",
    "Qual módulo do Sienge?",
    "selecao",
    True,
    ["Financeiro", "Não sei"],
    15,
    mostrar_se=("sistema", "Sienge"),
)


def test_modulo_obrigatorio_so_quando_o_sistema_e_escolhido():
    with pytest.raises(ErroApp) as erro:
        validar_formulario([SISTEMA, MODULO], "Acesso ao financeiro", {"sistema": "Sienge"})
    assert [c.campo for c in erro.value.campos] == ["modulo_sienge"]
    ok = validar_formulario(
        [SISTEMA, MODULO],
        "Acesso ao financeiro",
        {"sistema": "Sienge", "modulo_sienge": "Financeiro"},
    )
    assert ok.respostas == {"sistema": "Sienge", "modulo_sienge": "Financeiro"}


def test_modulo_escondido_e_ignorado():
    ok = validar_formulario(
        [SISTEMA, MODULO], "Acesso ao CV", {"sistema": "CVCRM", "modulo_sienge": "Financeiro"}
    )
    assert ok.respostas == {"sistema": "CVCRM"}


# ---------------------------------------------------------------- limites de caracteres (2026-10-23)
def test_descricao_ate_2000_caracteres():
    descricao = CampoForm("descricao", "Descreva", "texto_longo", True, [], 100)
    assert validar_formulario([descricao], "Resumo", {"descricao": "x" * 2000}).respostas
    with pytest.raises(ErroApp) as erro:
        validar_formulario([descricao], "Resumo", {"descricao": "x" * 2001})
    assert erro.value.campos[0].mensagem == "O campo Descreva pode ter até 2.000 caracteres."


def test_resumo_vai_ate_100_caracteres():
    assert len(validar_formulario([], "y" * 150, {}).titulo) == 100
