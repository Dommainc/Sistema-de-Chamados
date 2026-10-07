"""Proteções HTTP da API: cabeçalhos, limite de corpo, CORS e documentação fechada em produção."""

from fastapi.testclient import TestClient

from app.main import criar_app
from app.seguranca import TAMANHO_MAX_CORPO


def test_toda_resposta_tem_os_cabecalhos_de_seguranca(ambiente):
    ambiente("dev")
    resposta = TestClient(criar_app()).get("/saude")
    assert resposta.headers["x-content-type-options"] == "nosniff"
    assert resposta.headers["x-frame-options"] == "DENY"
    assert resposta.headers["cache-control"] == "no-store"
    assert "max-age" in resposta.headers["strict-transport-security"]


def test_corpo_grande_demais_e_recusado_sem_ler(ambiente):
    ambiente("dev")
    cliente = TestClient(criar_app())
    resposta = cliente.post(
        "/chamados",
        content=b"x" * (TAMANHO_MAX_CORPO + 1),
        headers={"Content-Type": "application/json"},
    )
    assert resposta.status_code == 413
    erro = resposta.json()["erro"]
    assert erro["codigo"] == "ERRO_INESPERADO" and erro["ref"].startswith("ERR-")
    assert resposta.headers["x-content-type-options"] == "nosniff"


def test_cors_so_libera_o_endereco_do_front(ambiente, monkeypatch):
    monkeypatch.setenv("WEB_ORIGEM", "https://central.dommainc.com.br")
    ambiente("prod")
    cliente = TestClient(criar_app())
    pedido = {"Access-Control-Request-Method": "POST"}
    liberado = cliente.options(
        "/chamados", headers={"Origin": "https://central.dommainc.com.br", **pedido}
    )
    assert liberado.headers["access-control-allow-origin"] == "https://central.dommainc.com.br"
    estranho = cliente.options(
        "/chamados", headers={"Origin": "https://site-estranho.com", **pedido}
    )
    assert "access-control-allow-origin" not in estranho.headers


def test_documentacao_interativa_fechada_em_producao(ambiente):
    ambiente("prod")
    cliente = TestClient(criar_app())
    assert cliente.get("/docs").status_code == 404
    assert cliente.get("/openapi.json").status_code == 404
    ambiente("dev")
    assert TestClient(criar_app()).get("/docs").status_code == 200
