from __future__ import annotations

import os

# Os testes NUNCA leem o apps/api/.env local (que aponta para o Supabase da nuvem): só variáveis de ambiente.
# No CI as variáveis do banco local vêm do próprio job. Precisa vir antes de importar app.config.
os.environ["CENTRAL_ENV_FILE"] = ""

from collections.abc import Iterator

import pytest

from app.config import obter_settings


@pytest.fixture
def ambiente(monkeypatch: pytest.MonkeyPatch) -> Iterator[object]:
    """Troca o AMBIENTE (dev/prod) durante um teste: `ambiente("prod")`."""

    def definir(valor: str) -> None:
        monkeypatch.setenv("AMBIENTE", valor)
        obter_settings.cache_clear()

    yield definir
    obter_settings.cache_clear()
