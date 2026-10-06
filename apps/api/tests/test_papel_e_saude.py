from fastapi.testclient import TestClient

from app.dominio.papel import extrair_grupos, papel_pelos_grupos
from app.main import criar_app

GRUPO_TI = "11111111-aaaa-bbbb-cccc-000000000001"


def test_grupos_em_cada_lugar_que_o_supabase_pode_entregar():
    assert extrair_grupos({"groups": ["a"]}) == ["a"]
    assert extrair_grupos({"user_metadata": {"custom_claims": {"groups": ["b"]}}}) == ["b"]
    assert extrair_grupos({"user_metadata": {"groups": ["c"]}}) == ["c"]
    assert extrair_grupos({"user_metadata": {}}) is None


def test_papel_pelo_grupo_do_entra():
    assert papel_pelos_grupos({"groups": [GRUPO_TI, "outro"]}, GRUPO_TI) == "ti"
    assert papel_pelos_grupos({"groups": ["outro"]}, GRUPO_TI) == "solicitante"
    # Sem claim: quem chama decide (menor privilégio + log).
    assert papel_pelos_grupos({}, GRUPO_TI) is None
    # Grupo da TI não configurado: ninguém vira TI por engano.
    assert papel_pelos_grupos({"groups": [GRUPO_TI]}, None) == "solicitante"


def test_saude_sem_banco_configurado(ambiente, monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    ambiente("dev")
    with TestClient(criar_app()) as cliente:
        resposta = cliente.get("/saude")
    assert resposta.status_code == 200
    assert resposta.json() == {
        "status": "ok",
        "versao": "0.1.0",
        "ambiente": "dev",
        "banco": "nao_configurado",
    }


def test_documentacao_openapi_tem_as_rotas_e_exemplos_de_erro():
    esquema = criar_app().openapi()
    assert {"/saude", "/me", "/auth/sincronizar"} <= set(esquema["paths"])
    exemplo = esquema["paths"]["/me"]["get"]["responses"]["401"]["content"]["application/json"]
    assert exemplo["example"]["erro"]["codigo"] == "SESSAO_EXPIRADA"
