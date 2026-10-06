from __future__ import annotations

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
