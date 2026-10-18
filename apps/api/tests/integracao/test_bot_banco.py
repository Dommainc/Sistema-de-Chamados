"""Bot do Teams contra um Supabase de verdade (job "banco" do CI): fila de avisos e conversas do bot.

O Teams aqui é de mentira (grava o que seria enviado). Pulado sem banco — ver ajuda.py.
"""

from __future__ import annotations

import os
from typing import Any

import asyncpg
import pytest
from fastapi.testclient import TestClient

from app.integracoes.teams.conector import ErroTeams, Membro
from app.integracoes.teams.processador import ERRO_ANTIGO, ERRO_SEM_CONVERSA, processar

from .ajuda import SO_COM_BANCO

pytestmark = SO_COM_BANCO

ANA = "aaaaaaaa-0000-0000-0000-000000000001"
BRUNO = "bbbbbbbb-0000-0000-0000-000000000002"
TEAMS_ANA = "29:ana-teste-integracao"
SERVICE_URL = "https://teams.de-mentira.example/"


class TeamsDeMentira:
    def __init__(self, falhar: bool = False) -> None:
        self.falhar = falhar
        self.enviadas: list[tuple[str, dict[str, Any]]] = []

    async def enviar(self, service_url: str, conversa_id: str, atividade: dict[str, Any]) -> None:
        if self.falhar:
            raise ErroTeams("Teams: HTTP 503")
        self.enviadas.append((conversa_id, atividade))

    async def membro(self, service_url: str, conversa_id: str, usuario_id: str) -> Membro | None:
        return Membro(email="ana@teste.local", upn=None, aad_object_id="aad-ana", nome="Ana")


@pytest.fixture
async def conn():
    c = await asyncpg.connect(os.environ["DATABASE_URL"], statement_cache_size=0)
    await c.execute("delete from public.teams_conversas where teams_user_id like '29:%teste%'")
    yield c
    await c.execute("delete from public.teams_conversas where teams_user_id like '29:%teste%'")
    await c.close()


async def novo_chamado(conn: asyncpg.Connection) -> int:
    return await conn.fetchval(
        """insert into public.chamados (titulo, categoria_id, solicitante_id)
           values ('Teste do bot', (select id from public.categorias where nome = 'Outros'), $1)
           returning id""",
        ANA,
    )


async def novo_aviso(conn, chamado: int, destinatario: str, tipo: str, **extra) -> int:
    criado = extra.pop("criado_em", None)
    return await conn.fetchval(
        """insert into public.notificacoes (chamado_id, destinatario_id, tipo, payload, criado_em)
           values ($1, $2, $3, $4::jsonb, coalesce($5, now())) returning id""",
        chamado,
        destinatario,
        tipo,
        "{}",
        criado,
    )


async def processar_ate_sair_da_fila(conn, teams, aviso_id: int) -> asyncpg.Record:
    """A fila pode ter avisos de outros testes na frente: processa até o nosso sair de 'pendente'."""
    for _ in range(50):
        await processar(conn, teams, "https://central.example")
        linha = await conn.fetchrow("select * from public.notificacoes where id = $1", aviso_id)
        if linha["status"] != "pendente" or linha["tentativas"] > 0:
            return linha
    raise AssertionError("aviso não foi processado")


async def guardar_conversa_da_ana(conn) -> None:
    await conn.execute(
        """insert into public.teams_conversas (teams_user_id, email, conversation_id, service_url)
           values ($1, 'ana@teste.local', 'a:conversa-ana', $2)""",
        TEAMS_ANA,
        SERVICE_URL,
    )


async def test_aviso_vai_para_o_teams_e_liga_a_conversa_ao_perfil(conn):
    await guardar_conversa_da_ana(conn)
    chamado = await novo_chamado(conn)
    aviso = await novo_aviso(conn, chamado, ANA, "chamado_aberto")
    teams = TeamsDeMentira()

    linha = await processar_ate_sair_da_fila(conn, teams, aviso)

    assert linha["status"] == "enviada" and linha["enviado_em"] is not None
    conversa, atividade = next(e for e in teams.enviadas if e[0] == "a:conversa-ana")
    assert conversa == "a:conversa-ana"
    card = atividade["attachments"][0]["content"]
    assert card["body"][0]["text"] == f"Chamado #{chamado}"
    assert card["actions"][0]["url"] == f"https://central.example/chamados/{chamado}"
    guardada = await conn.fetchrow(
        "select profile_id, ultimo_chamado_notificado from public.teams_conversas where teams_user_id = $1",
        TEAMS_ANA,
    )
    assert str(guardada["profile_id"]) == ANA
    assert guardada["ultimo_chamado_notificado"] == chamado


async def test_teams_fora_do_ar_tenta_de_novo_e_desiste_na_terceira(conn):
    await guardar_conversa_da_ana(conn)
    aviso = await novo_aviso(conn, await novo_chamado(conn), ANA, "chamado_assumido")
    teams = TeamsDeMentira(falhar=True)

    linha = await processar_ate_sair_da_fila(conn, teams, aviso)
    assert (linha["status"], linha["tentativas"], linha["erro"]) == (
        "pendente",
        1,
        "Teams: HTTP 503",
    )
    adiada = await conn.fetchval(
        "select proxima_tentativa_em > now() from public.notificacoes where id = $1", aviso
    )
    assert adiada

    for _ in range(2):
        await conn.execute(
            "update public.notificacoes set proxima_tentativa_em = now() where id = $1", aviso
        )
        for _ in range(50):
            antes = await conn.fetchval(
                "select tentativas from public.notificacoes where id = $1", aviso
            )
            await processar(conn, teams, "https://central.example")
            if (
                await conn.fetchval(
                    "select tentativas from public.notificacoes where id = $1", aviso
                )
                > antes
            ):
                break
    final = await conn.fetchrow(
        "select status, tentativas from public.notificacoes where id = $1", aviso
    )
    assert (final["status"], final["tentativas"]) == ("falhou", 3)


async def test_sem_conversa_com_o_bot_nao_tenta_de_novo(conn):
    aviso = await novo_aviso(conn, await novo_chamado(conn), BRUNO, "nova_mensagem")
    linha = await processar_ate_sair_da_fila(conn, TeamsDeMentira(), aviso)
    assert (linha["status"], linha["erro"]) == ("falhou", ERRO_SEM_CONVERSA)


async def test_aviso_antigo_nao_e_mandado(conn):
    await guardar_conversa_da_ana(conn)
    chamado = await novo_chamado(conn)
    aviso = await conn.fetchval(
        """insert into public.notificacoes (chamado_id, destinatario_id, tipo, criado_em)
           values ($1, $2, 'chamado_aberto', now() - interval '2 days') returning id""",
        chamado,
        ANA,
    )
    teams = TeamsDeMentira()
    await processar(conn, teams, "https://central.example")
    linha = await conn.fetchrow("select status, erro from public.notificacoes where id = $1", aviso)
    assert (linha["status"], linha["erro"]) == ("falhou", ERRO_ANTIGO)


def test_mensagem_para_o_bot_guarda_a_conversa_e_responde():
    from app.main import criar_app
    from app.routers.bot import obter_conector, obter_verificador

    class SemVerificar:
        def verificar(self, autorizacao, service_url):
            return {}

    teams = TeamsDeMentira()
    app = criar_app()
    app.dependency_overrides[obter_verificador] = SemVerificar
    app.dependency_overrides[obter_conector] = lambda: teams
    atividade = {
        "type": "message",
        "text": "oi, meu computador não liga",
        "serviceUrl": SERVICE_URL,
        "from": {"id": TEAMS_ANA, "aadObjectId": "aad-ana"},
        "conversation": {"id": "a:conversa-ana", "conversationType": "personal"},
    }
    with TestClient(app) as cliente:
        assert cliente.post("/bot/mensagens", json=atividade).status_code == 200

    async def conferir():
        c = await asyncpg.connect(os.environ["DATABASE_URL"], statement_cache_size=0)
        try:
            guardada = await c.fetchrow(
                "select profile_id, email from public.teams_conversas where teams_user_id = $1",
                TEAMS_ANA,
            )
            registro = await c.fetchval(
                """select texto_recebido from public.bot_respostas_automaticas
                    where teams_user_id = $1 order by id desc limit 1""",
                TEAMS_ANA,
            )
            await c.execute(
                "delete from public.teams_conversas where teams_user_id = $1", TEAMS_ANA
            )
            return guardada, registro
        finally:
            await c.close()

    import asyncio

    guardada, registro = asyncio.run(conferir())
    assert (str(guardada["profile_id"]), guardada["email"]) == (ANA, "ana@teste.local")
    assert registro == "oi, meu computador não liga"
    _, resposta = teams.enviadas[-1]
    acoes = resposta["attachments"][0]["content"]["actions"]
    assert acoes[-1]["title"] == "Abrir a Central"


def test_boas_vindas_so_na_primeira_instalacao():
    from app.main import criar_app
    from app.routers.bot import obter_conector, obter_verificador

    class SemVerificar:
        def verificar(self, autorizacao, service_url):
            return {}

    teams = TeamsDeMentira()
    app = criar_app()
    app.dependency_overrides[obter_verificador] = SemVerificar
    app.dependency_overrides[obter_conector] = lambda: teams
    base = {
        "type": "installationUpdate",
        "serviceUrl": SERVICE_URL,
        "from": {"id": TEAMS_ANA, "aadObjectId": "aad-ana"},
        "conversation": {"id": "a:conversa-ana", "conversationType": "personal"},
    }
    with TestClient(app) as cliente:
        assert cliente.post("/bot/mensagens", json={**base, "action": "add"}).status_code == 200
        assert len(teams.enviadas) == 1
        texto = teams.enviadas[0][1]["attachments"][0]["content"]["body"][0]["text"]
        assert texto.startswith("Olá!")
        # Atualização do app: guarda a conversa de novo, sem repetir as boas-vindas.
        assert (
            cliente.post("/bot/mensagens", json={**base, "action": "add-upgrade"}).status_code
            == 200
        )
        assert len(teams.enviadas) == 1

    async def limpar():
        c = await asyncpg.connect(os.environ["DATABASE_URL"], statement_cache_size=0)
        try:
            await c.execute(
                "delete from public.teams_conversas where teams_user_id = $1", TEAMS_ANA
            )
        finally:
            await c.close()

    import asyncio

    asyncio.run(limpar())


async def test_resumo_mensal_vai_para_o_teams_sem_chamado(conn):
    await guardar_conversa_da_ana(conn)
    aviso = await conn.fetchval(
        """insert into public.notificacoes (chamado_id, destinatario_id, tipo, payload)
           values (null, $1, 'resumo_mensal', $2::jsonb) returning id""",
        ANA,
        '{"mes": "2026-09", "atual": {"abertos": 3}, "anterior": {"abertos": 1}}',
    )
    teams = TeamsDeMentira()
    linha = await processar_ate_sair_da_fila(conn, teams, aviso)
    assert linha["status"] == "enviada"
    card = next(a for c, a in teams.enviadas if c == "a:conversa-ana")["attachments"][0]["content"]
    assert card["body"][0]["text"] == "Resumo da TI · setembro de 2026"
