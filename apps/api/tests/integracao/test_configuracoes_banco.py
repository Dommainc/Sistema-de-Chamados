"""Configurações (ADR 0022) contra um Supabase de verdade: só a TI grava, a lista muda, a pergunta de
módulo segue o sistema renomeado e tudo fica no registro. Cada teste devolve o banco como estava.
Pulado sem banco — ver ajuda.py. Roda no job "banco" do CI.
"""

import pytest
from fastapi.testclient import TestClient

from .ajuda import SO_COM_BANCO, cabecalho, ler

pytestmark = SO_COM_BANCO


@pytest.fixture(scope="module")
def cliente():
    from app.main import criar_app

    with TestClient(criar_app()) as c:
        yield c


@pytest.fixture(scope="module")
def ti():
    return cabecalho("tec@teste.local")


@pytest.fixture(scope="module")
def bruno():
    return cabecalho("bruno@teste.local")


def _campo(chave: str, auth: dict[str, str]) -> dict:
    return ler("campos_form", f"chave=eq.{chave}&select=id,opcoes,cores,mostrar_se", auth)[0]


def _lista(campo: dict) -> list[dict]:
    return [{"nome": n, "cor": campo["cores"].get(n), "antigo": n} for n in campo["opcoes"]]


def test_solicitante_nao_mexe(cliente, bruno, ti):
    sistema = _campo("sistema", ti)
    resposta = cliente.patch(
        f"/configuracoes/campos/{sistema['id']}/opcoes",
        headers=bruno,
        json={"opcoes": [{"nome": "Qualquer"}]},
    )
    assert resposta.status_code == 403
    assert resposta.json()["erro"]["codigo"] == "SEM_PERMISSAO"
    assert (
        cliente.patch(
            "/configuracoes/expediente", headers=bruno, json={"inicio": "07:00", "fim": "19:00"}
        ).status_code
        == 403
    )


def test_renomear_sienge_leva_a_pergunta_de_modulo_junto(cliente, ti):
    sistema = _campo("sistema", ti)
    original = _lista(sistema)
    url = f"/configuracoes/campos/{sistema['id']}/opcoes"
    renomeada = [{**o, "nome": "Sienge ERP"} if o["nome"] == "Sienge" else o for o in original] + [
        {"nome": "Sistema Novo do Teste", "cor": "azul"}
    ]
    try:
        resposta = cliente.patch(url, headers=ti, json={"opcoes": renomeada})
        assert resposta.status_code == 200, resposta.text
        assert "Sienge ERP" in resposta.json()["opcoes"]
        assert resposta.json()["cores"]["Sistema Novo do Teste"] == "azul"
        assert _campo("modulo_sienge", ti)["mostrar_se"] == {
            "campo": "sistema",
            "igual": "Sienge ERP",
        }
        registro = ler("config_alteracoes", "area=eq.formularios&order=id.desc&limit=1", ti)[0]
        assert "Sienge → Sienge ERP" in registro["resumo"]
        assert "+ Sistema Novo do Teste" in registro["resumo"]
    finally:
        volta = [
            {**o, "nome": "Sienge", "antigo": "Sienge ERP"} if o["nome"] == "Sienge" else o
            for o in original
        ]
        assert cliente.patch(url, headers=ti, json={"opcoes": volta}).status_code == 200
    assert _campo("modulo_sienge", ti)["mostrar_se"]["igual"] == "Sienge"
    assert _campo("sistema", ti)["opcoes"] == sistema["opcoes"]


def test_nao_tira_opcao_que_abre_pergunta_nem_repete(cliente, ti):
    sistema = _campo("sistema", ti)
    url = f"/configuracoes/campos/{sistema['id']}/opcoes"
    sem_cvcrm = [o for o in _lista(sistema) if o["nome"] != "CVCRM"]
    resposta = cliente.patch(url, headers=ti, json={"opcoes": sem_cvcrm})
    assert resposta.json()["erro"]["codigo"] == "OPCAO_COM_PERGUNTAS"
    repetida = [*_lista(sistema), {"nome": "sienge"}]
    assert cliente.patch(url, headers=ti, json={"opcoes": repetida}).json()["erro"]["codigo"] == (
        "NOME_DUPLICADO"
    )


def test_resposta_pronta_desativada_some_do_chat_mas_fica_na_configuracao(cliente, ti):
    criada = cliente.post(
        "/configuracoes/respostas-prontas",
        headers=ti,
        json={"titulo": "Teste de configuração", "texto": "Oi, {nome}! Teste."},
    )
    assert criada.status_code == 200, criada.text
    linha = ler("respostas_prontas", "titulo=eq.Teste de configuração", ti)[0]
    resposta = cliente.patch(
        f"/configuracoes/respostas-prontas/{linha['id']}", headers=ti, json={"ativo": False}
    )
    assert resposta.status_code == 200
    assert ler("respostas_prontas", f"id=eq.{linha['id']}", ti)[0]["ativo"] is False
    duplicada = cliente.post(
        "/configuracoes/respostas-prontas",
        headers=ti,
        json={"titulo": "teste de configuração", "texto": "x"},
    )
    assert duplicada.json()["erro"]["codigo"] == "NOME_DUPLICADO"


def test_feriado_e_expediente(cliente, ti):
    novo = cliente.post(
        "/configuracoes/feriados",
        headers=ti,
        json={"data": "2030-12-24", "nome": "Véspera de teste", "escopo": "ponto_facultativo"},
    )
    assert novo.status_code == 200, novo.text
    repetido = cliente.post(
        "/configuracoes/feriados", headers=ti, json={"data": "2030-12-24", "nome": "De novo"}
    )
    assert repetido.json()["erro"]["codigo"] == "FERIADO_DUPLICADO"
    assert (
        cliente.patch(
            "/configuracoes/feriados/2030-12-24", headers=ti, json={"ativo": False}
        ).status_code
        == 200
    )

    invalido = cliente.patch(
        "/configuracoes/expediente", headers=ti, json={"inicio": "20:00", "fim": "08:00"}
    )
    assert invalido.json()["erro"]["codigo"] == "EXPEDIENTE_INVALIDO"
    try:
        ok = cliente.patch(
            "/configuracoes/expediente", headers=ti, json={"inicio": "07:30", "fim": "19:00"}
        )
        assert ok.status_code == 200
        valores = {
            c["chave"]: c["valor"]
            for c in ler("configuracoes", "chave=like.expediente_*&select=chave,valor", ti)
        }
        assert valores == {"expediente_inicio": "07:30", "expediente_fim": "19:00"}
    finally:
        cliente.patch(
            "/configuracoes/expediente", headers=ti, json={"inicio": "08:00", "fim": "20:00"}
        )
