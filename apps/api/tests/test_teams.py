"""Bot do Teams (docs/adr/0018): textos dos avisos, token do Teams, conector e rotas protegidas."""

from __future__ import annotations

import json
import time
from datetime import UTC, datetime

import httpx
import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from app.erros.catalogo import ErroApp
from app.integracoes.teams.cartoes import DadosAviso, cartao, montar_aviso, resposta_automatica
from app.integracoes.teams.conector import ConectorTeams, ErroTeams
from app.integracoes.teams.entrada import EMISSOR_BOT_FRAMEWORK, VerificadorTeams

APP_ID = "11111111-2222-3333-4444-555555555555"
TENANT = "99999999-8888-7777-6666-555555555555"
SERVICE_URL = "https://smba.trafficmanager.net/br/"
CHAVE = rsa.generate_private_key(public_exponent=65537, key_size=2048)
OUTRA = rsa.generate_private_key(public_exponent=65537, key_size=2048)


# ------------------------------------------------------------------ textos dos avisos
def dados(tipo: str, **extra) -> DadosAviso:
    base = {
        "tipo": tipo,
        "payload": {},
        "chamado_id": 42,
        "titulo": "Outlook não sincroniza",
        "status": "em_andamento",
        "para_solicitante": True,
        "solicitante_nome": "Ana Souza",
        "responsavel_nome": "Rafael Lima",
        "prazo": None,
        "motivo_cancelamento": None,
        "ultima_mensagem": None,
        "motivo_transferencia": None,
    }
    return DadosAviso(**{**base, **extra})


@pytest.mark.parametrize(
    ("tipo", "extra", "esperado"),
    [
        ("chamado_aberto", {}, "Recebemos seu chamado #42"),
        ("chamado_aberto", {"para_solicitante": False}, "Chamado novo #42, aberto por Ana Souza"),
        ("chamado_assumido", {}, "Rafael Lima começou a atender seu chamado #42"),
        ("chamado_transferido", {"para_solicitante": False}, "transferido para você"),
        ("nova_mensagem", {}, "Rafael Lima respondeu no seu chamado #42"),
        ("nova_mensagem", {"para_solicitante": False}, "Ana respondeu no chamado #42"),
        (
            "status_alterado",
            {"payload": {"para": "aguardando_usuario", "automatico": True}},
            "esperando sua resposta há 2 horas",
        ),
        ("status_alterado", {"payload": {"para": "concluido"}}, "Como foi o atendimento?"),
        ("status_alterado", {"payload": {"para": "cancelado"}}, "foi cancelado"),
        ("aviso_inatividade", {}, "ainda está esperando sua resposta"),
        ("tipo_novo", {}, "Novidade no chamado #42"),
    ],
)
def test_texto_de_cada_aviso(tipo, extra, esperado):
    assert esperado in montar_aviso(dados(tipo, **extra)).texto


def test_concluido_convida_para_avaliar_e_mensagem_mostra_trecho():
    assert montar_aviso(dados("status_alterado", payload={"para": "concluido"})).botao == "Avaliar"
    aviso = montar_aviso(dados("nova_mensagem", ultima_mensagem="Consegue abrir " + "x" * 400))
    assert aviso.detalhe is not None and aviso.detalhe.startswith("“Consegue abrir")
    assert len(aviso.detalhe) <= 205


def test_prazo_em_horario_de_brasilia():
    prazo = datetime(2026, 10, 16, 14, 0, tzinfo=UTC)  # 11:00 em São Paulo
    texto = montar_aviso(dados("prazo_definido", prazo=prazo)).texto
    assert "16/10 às 11:00" in texto


def test_cartao_tem_titulo_e_botao_para_o_chamado():
    atividade = cartao(dados("chamado_assumido"), "https://central/chamados/42")
    card = atividade["attachments"][0]["content"]
    assert card["type"] == "AdaptiveCard"
    assert card["body"][0]["text"] == "Chamado #42"
    assert card["actions"] == [
        {"type": "Action.OpenUrl", "title": "Abrir chamado", "url": "https://central/chamados/42"}
    ]
    assert "Rafael Lima" in atividade["summary"]


def test_resposta_automatica_aponta_o_ultimo_chamado():
    com = resposta_automatica("Olá!", "https://central", 41)
    urls = [a["url"] for a in com["attachments"][0]["content"]["actions"]]
    assert urls == ["https://central/chamados/41", "https://central"]
    sem = resposta_automatica("Olá!", "https://central", None)
    assert [a["url"] for a in sem["attachments"][0]["content"]["actions"]] == ["https://central"]


# ------------------------------------------------------------------ token do Teams
def token_teams(*, chave=CHAVE, emissor=EMISSOR_BOT_FRAMEWORK, aud=APP_ID, **extra) -> str:
    agora = int(time.time())
    claims = {"iss": emissor, "aud": aud, "exp": agora + 600, "nbf": agora - 10}
    claims.update(extra)
    return jwt.encode(claims, chave, algorithm="RS256")


def verificador() -> VerificadorTeams:
    publica = CHAVE.public_key()
    return VerificadorTeams(
        APP_ID, TENANT, chave_bot_framework=lambda _t: publica, chave_entra=lambda _t: publica
    )


def test_token_do_teams_valido():
    claims = verificador().verificar(f"Bearer {token_teams(serviceurl=SERVICE_URL)}", SERVICE_URL)
    assert claims["aud"] == APP_ID


def test_token_do_entra_da_domma_tambem_vale():
    emissor = f"https://login.microsoftonline.com/{TENANT}/v2.0"
    verificador().verificar(f"Bearer {token_teams(emissor=emissor)}", SERVICE_URL)


@pytest.mark.parametrize(
    "autorizacao",
    [
        None,
        "Basic abc",
        f"Bearer {token_teams(chave=OUTRA)}",
        f"Bearer {token_teams(aud='outro-app')}",
        f"Bearer {token_teams(emissor='https://malicioso.example')}",
        f"Bearer {token_teams(serviceurl='https://outro.example/')}",
    ],
)
def test_token_recusado(autorizacao):
    with pytest.raises(ErroApp) as erro:
        verificador().verificar(autorizacao, SERVICE_URL)
    assert erro.value.codigo == "SEM_PERMISSAO"


# ------------------------------------------------------------------ conector (Teams de mentira)
class TeamsDeMentira:
    def __init__(self, status_envio: int = 201) -> None:
        self.status_envio = status_envio
        self.tokens = 0
        self.enviadas: list[tuple[str, dict]] = []

    def __call__(self, pedido: httpx.Request) -> httpx.Response:
        if pedido.url.host == "login.microsoftonline.com":
            self.tokens += 1
            corpo = dict(httpx.QueryParams(pedido.content.decode()))
            assert corpo["scope"] == "https://api.botframework.com/.default"
            return httpx.Response(200, json={"access_token": "tok", "expires_in": 3600})
        assert pedido.headers["Authorization"] == "Bearer tok"
        if pedido.method == "GET":
            return httpx.Response(
                200,
                json={"email": "Ana@DommaInc.com.br", "userPrincipalName": "ana@dommainc.com.br"},
            )
        self.enviadas.append((str(pedido.url), json.loads(pedido.content)))
        return httpx.Response(self.status_envio, json={"id": "1"})


def conector(teams: TeamsDeMentira) -> ConectorTeams:
    return ConectorTeams(APP_ID, "segredo", TENANT, transporte=httpx.MockTransport(teams))


async def test_conector_envia_e_reaproveita_o_token():
    teams = TeamsDeMentira()
    c = conector(teams)
    await c.enviar(SERVICE_URL, "a:conversa/1", {"type": "message"})
    await c.enviar(SERVICE_URL, "a:conversa/1", {"type": "message"})
    assert teams.tokens == 1
    assert teams.enviadas[0][0].endswith("/v3/conversations/a%3Aconversa%2F1/activities")


async def test_conector_falha_vira_erro_teams():
    with pytest.raises(ErroTeams, match="HTTP 503"):
        await conector(TeamsDeMentira(status_envio=503)).enviar(SERVICE_URL, "a:1", {})


async def test_conector_le_email_em_minusculo():
    membro = await conector(TeamsDeMentira()).membro(SERVICE_URL, "a:1", "29:ana")
    assert membro is not None and membro.email == "ana@dommainc.com.br"


# ------------------------------------------------------------------ rotas protegidas
@pytest.fixture
def cliente(monkeypatch):
    from app.config import obter_settings
    from app.main import criar_app

    monkeypatch.setenv("PROCESSADOR_SEGREDO", "segredo-do-banco")
    obter_settings.cache_clear()
    with TestClient(criar_app()) as c:
        yield c
    obter_settings.cache_clear()


@pytest.mark.parametrize("cabecalhos", [{}, {"X-Central-Secret": "errado"}])
def test_processador_exige_o_segredo(cliente, cabecalhos):
    resposta = cliente.post("/internal/notificacoes/processar", headers=cabecalhos)
    assert resposta.status_code == 403


def test_processador_sem_bot_configurado_nao_faz_nada(cliente):
    resposta = cliente.post(
        "/internal/notificacoes/processar", headers={"X-Central-Secret": "segredo-do-banco"}
    )
    assert resposta.json() == {"configurado": False}


def test_mensagens_do_teams_sem_bot_configurado_recusa(cliente):
    assert cliente.post("/bot/mensagens", json={"type": "message"}).status_code == 403


def test_rota_do_bot_tambem_responde_com_prefixo_api(cliente):
    assert cliente.post("/api/internal/notificacoes/processar").status_code == 403
