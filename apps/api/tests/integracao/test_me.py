"""/me contra um Supabase de verdade (pulado sem banco — ver ajuda.py)."""

import pytest
from fastapi.testclient import TestClient

from .ajuda import SO_COM_BANCO, cabecalho

pytestmark = SO_COM_BANCO


@pytest.fixture
def cliente():
    from app.main import criar_app

    with TestClient(criar_app()) as c:
        yield c


def test_me_devolve_o_proprio_perfil(cliente):
    resposta = cliente.get("/me", headers=cabecalho("bruno@teste.local"))
    assert resposta.status_code == 200
    assert resposta.json()["email"] == "bruno@teste.local"
    assert resposta.json()["papel"] == "solicitante"


def test_ana_comeca_com_cadastro_pendente(cliente):
    resposta = cliente.get("/me", headers=cabecalho("ana@teste.local"))
    assert resposta.json()["cadastro_pendente"] is True


def test_patch_me_nao_muda_o_papel(cliente):
    resposta = cliente.patch(
        "/me",
        headers=cabecalho("bruno@teste.local"),
        json={"departamento": "Obras", "telefone": "21 99999-0000", "papel": "ti"},
    )
    assert resposta.status_code == 200
    assert resposta.json()["papel"] == "solicitante"


def test_tecnico_tem_papel_ti(cliente):
    resposta = cliente.get("/me", headers=cabecalho("tec@teste.local"))
    assert resposta.json()["papel"] == "ti"
