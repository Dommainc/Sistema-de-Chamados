"""Testes contra um Supabase de verdade (local ou dev).

Pulados enquanto não houver banco (P-022/P-023).

Para rodar: suba o banco (`supabase start`), aplique o `seed.dev.sql` e defina no ambiente
DATABASE_URL (central_api), SUPABASE_URL e SUPABASE_ANON_KEY. Os tokens vêm do login por senha dos
usuários de teste (CLAUDE.md, "Desenvolvimento local sem Entra ID").
"""

import os

import httpx
import pytest
from fastapi.testclient import TestClient

pytestmark = [
    pytest.mark.banco,
    pytest.mark.skipif(
        not (
            os.getenv("DATABASE_URL")
            and os.getenv("SUPABASE_URL")
            and os.getenv("SUPABASE_ANON_KEY")
        ),
        reason="sem banco: defina DATABASE_URL, SUPABASE_URL e SUPABASE_ANON_KEY",
    ),
]


def entrar(email: str) -> str:
    resposta = httpx.post(
        f"{os.environ['SUPABASE_URL']}/auth/v1/token?grant_type=password",
        headers={"apikey": os.environ["SUPABASE_ANON_KEY"]},
        json={"email": email, "password": "teste123"},
        timeout=10,
    )
    resposta.raise_for_status()
    return resposta.json()["access_token"]


@pytest.fixture
def cliente():
    from app.main import criar_app

    with TestClient(criar_app()) as c:
        yield c


def test_me_devolve_o_proprio_perfil(cliente):
    resposta = cliente.get(
        "/me", headers={"Authorization": f"Bearer {entrar('bruno@teste.local')}"}
    )
    assert resposta.status_code == 200
    assert resposta.json()["email"] == "bruno@teste.local"
    assert resposta.json()["papel"] == "solicitante"


def test_ana_comeca_com_cadastro_pendente(cliente):
    resposta = cliente.get("/me", headers={"Authorization": f"Bearer {entrar('ana@teste.local')}"})
    assert resposta.json()["cadastro_pendente"] is True


def test_patch_me_nao_muda_o_papel(cliente):
    token = entrar("bruno@teste.local")
    resposta = cliente.patch(
        "/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"departamento": "Obras", "telefone": "21 99999-0000", "papel": "ti"},
    )
    assert resposta.status_code == 200
    assert resposta.json()["papel"] == "solicitante"


def test_tecnico_tem_papel_ti(cliente):
    resposta = cliente.get("/me", headers={"Authorization": f"Bearer {entrar('tec@teste.local')}"})
    assert resposta.json()["papel"] == "ti"
