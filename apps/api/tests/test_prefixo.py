"""Prefixo /api da Vercel Services (ADR 0017): as mesmas rotas com e sem o /api."""

from fastapi.testclient import TestClient

from app.main import app


def test_saude_com_e_sem_o_prefixo_api():
    cliente = TestClient(app)
    assert cliente.get("/saude").status_code == 200
    assert cliente.get("/api/saude").status_code == 200
    assert cliente.get("/api/saude").json()["status"] == "ok"


def test_rota_inexistente_continua_404():
    assert TestClient(app).get("/api/nao-existe").status_code == 404
    assert TestClient(app).get("/apis/saude").status_code == 404
