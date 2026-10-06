"""Apoio dos testes contra um Supabase de verdade (local ou o do CI, job "banco").

Para rodar: suba o banco (`supabase start`, que aplica migrations + seed.dev.sql) e defina no ambiente
DATABASE_URL (central_api), SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET e
SUPABASE_SERVICE_ROLE_KEY. Os tokens vêm do login por senha dos usuários de teste
(CLAUDE.md, "Desenvolvimento local sem Entra ID").
"""

import os

import httpx
import pytest

ANA = "aaaaaaaa-0000-0000-0000-000000000001"
BRUNO = "bbbbbbbb-0000-0000-0000-000000000002"
RAFAEL = "cccccccc-0000-0000-0000-000000000003"
THIAGO = "dddddddd-0000-0000-0000-000000000004"

SO_COM_BANCO = [
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


def cabecalho(email: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {entrar(email)}"}


def ler(tabela: str, filtro: str, auth: dict[str, str]) -> list[dict]:
    """Lê como o FRONT lê: REST do Supabase com a anon key e o token do usuário (RLS filtra)."""
    resposta = httpx.get(
        f"{os.environ['SUPABASE_URL']}/rest/v1/{tabela}?{filtro}",
        headers={"apikey": os.environ["SUPABASE_ANON_KEY"], **auth},
        timeout=10,
    )
    resposta.raise_for_status()
    return resposta.json()
