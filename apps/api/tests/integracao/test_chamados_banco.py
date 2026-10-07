"""Rotas de chamados contra um Supabase de verdade: SQL do RepositorioPostgres, triggers, RLS e Storage
(pendencias.md P-034). Pulado sem banco — ver ajuda.py. Roda no job "banco" do CI.
"""

import os
from datetime import UTC, datetime, timedelta

import httpx
import pytest
from fastapi.testclient import TestClient

from .ajuda import SO_COM_BANCO, THIAGO, cabecalho, ler

pytestmark = SO_COM_BANCO

PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00"
    b"\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\xff\xff?\x00\x05\xfe\x02\xfe\xa7\x35\x81\x84"
    b"\x00\x00\x00\x00IEND\xaeB`\x82"
)


@pytest.fixture(scope="module")
def cliente():
    from app.main import criar_app

    with TestClient(criar_app()) as c:
        yield c


@pytest.fixture(scope="module")
def ana():
    return cabecalho("ana@teste.local")


@pytest.fixture(scope="module")
def bruno():
    return cabecalho("bruno@teste.local")


@pytest.fixture(scope="module")
def rafael():
    return cabecalho("tec@teste.local")


@pytest.fixture(scope="module")
def thiago():
    return cabecalho("thiago@teste.local")


@pytest.fixture(scope="module")
def outros(ana) -> int:
    return ler("categorias", "nome=eq.Outros&select=id", ana)[0]["id"]


def abrir(cliente, auth, categoria_id: int, **extra) -> dict:
    resposta = cliente.post(
        "/chamados",
        headers=auth,
        json={
            "categoria_id": categoria_id,
            "titulo": "Teste de integração",
            "respostas": {"descricao": "aberto pelo CI"},
            **extra,
        },
    )
    assert resposta.status_code == 201, resposta.text
    return resposta.json()


def test_prazo_nasce_vazio_e_a_ti_define_e_altera(cliente, ana, rafael, outros):
    chamado = abrir(cliente, ana, outros)
    assert chamado["prazo_sla"] is None
    n = chamado["id"]
    amanha = (datetime.now(UTC) + timedelta(days=1)).replace(microsecond=0)

    # Antes de iniciar, a TI não mexe no chamado (ADR 0012).
    antes = cliente.post(f"/chamados/{n}/prazo", headers=rafael, json={"prazo": amanha.isoformat()})
    assert antes.json()["erro"]["codigo"] == "CHAMADO_NAO_INICIADO"
    assert cliente.post(f"/chamados/{n}/assumir", headers=rafael).status_code == 200

    # Prioridade: só TI, histórico interno (a Ana não vê o evento).
    alta = cliente.post(f"/chamados/{n}/prioridade", headers=rafael, json={"prioridade": "alta"})
    assert alta.json()["prioridade"] == "alta", alta.text
    assert ler("historico", f"chamado_id=eq.{n}&acao=eq.prioridade_alterada", ana) == []
    assert len(ler("historico", f"chamado_id=eq.{n}&acao=eq.prioridade_alterada", rafael)) == 1

    definido = cliente.post(
        f"/chamados/{n}/prazo", headers=rafael, json={"prazo": amanha.isoformat()}
    )
    assert definido.status_code == 200, definido.text
    sem_motivo = cliente.post(
        f"/chamados/{n}/prazo",
        headers=rafael,
        json={"prazo": (amanha + timedelta(days=1)).isoformat()},
    )
    assert sem_motivo.json()["erro"]["codigo"] == "MOTIVO_OBRIGATORIO"
    alterado = cliente.post(
        f"/chamados/{n}/prazo",
        headers=rafael,
        json={"prazo": (amanha + timedelta(days=1)).isoformat(), "motivo": "Peça em falta"},
    )
    assert alterado.status_code == 200, alterado.text

    # O solicitante vê a nova previsão e o motivo (histórico público).
    eventos = ler("historico", f"chamado_id=eq.{n}&acao=eq.prazo_definido&order=id", ana)
    assert len(eventos) == 2 and eventos[-1]["detalhe"]["motivo"] == "Peça em falta"
    negado = cliente.post(f"/chamados/{n}/prazo", headers=ana, json={"prazo": amanha.isoformat()})
    assert negado.json()["erro"]["codigo"] == "SEM_PERMISSAO"


def test_ciclo_completo_com_historico_e_notificacoes(cliente, ana, bruno, rafael, thiago, outros):
    chamado = abrir(cliente, ana, outros)
    n = chamado["id"]
    assert chamado["status"] == "pendente"

    def post(auth, acao, corpo=None):
        resposta = cliente.post(f"/chamados/{n}/{acao}", headers=auth, json=corpo)
        assert resposta.status_code in (200, 201, 204), f"{acao}: {resposta.text}"
        return resposta

    assert post(rafael, "assumir").json()["status"] == "em_andamento"
    transferido = post(rafael, "transferir", {"destino_id": THIAGO, "motivo": "e-mail"}).json()
    assert transferido["responsavel_id"] == THIAGO
    post(thiago, "assumir")
    post(thiago, "aguardar")
    post(thiago, "mensagens", {"conteudo": "Nota só da TI", "interna": True})
    post(ana, "mensagens", {"conteudo": "Testei, funcionou"})
    post(ana, "lido")
    assert post(thiago, "concluir").json()["status"] == "concluido"

    # O que o FRONT vê pelo REST (RLS): a Ana vê o chamado, mas não a nota interna.
    [visto] = ler("chamados", f"id=eq.{n}&select=status,responsavel_id", ana)
    assert visto == {"status": "concluido", "responsavel_id": THIAGO}
    conversa_ana = [m["conteudo"] for m in ler("mensagens", f"chamado_id=eq.{n}", ana)]
    assert conversa_ana == ["Testei, funcionou"]
    assert len(ler("mensagens", f"chamado_id=eq.{n}", rafael)) == 2
    assert ler("chamados", f"id=eq.{n}", bruno) == []

    # A resposta da Ana devolveu para "em atendimento" sozinha (evento sem autor).
    acoes = [h["acao"] for h in ler("historico", f"chamado_id=eq.{n}&order=id", rafael)]
    assert acoes[0] == "criado" and "transferido" in acoes and acoes[-1] == "concluido"
    assert len(ler("transferencias", f"chamado_id=eq.{n}", rafael)) == 1

    # Encerrado: banco e API recusam qualquer coisa.
    recusada = cliente.post(f"/chamados/{n}/mensagens", headers=ana, json={"conteudo": "voltou"})
    assert recusada.json()["erro"]["codigo"] == "TRANSICAO_INVALIDA"


def test_bruno_nao_mexe_no_chamado_da_ana_e_ana_nao_faz_acao_da_ti(
    cliente, ana, bruno, rafael, outros
):
    n = abrir(cliente, ana, outros)["id"]
    for auth, rota, corpo in [
        (bruno, "cancelar", {"motivo": "não é meu"}),
        (bruno, "mensagens", {"conteudo": "oi"}),
        (ana, "assumir", None),
        (ana, "concluir", None),
    ]:
        resposta = cliente.post(f"/chamados/{n}/{rota}", headers=auth, json=corpo)
        assert resposta.json()["erro"]["codigo"] == "SEM_PERMISSAO", rota
    # Só a TI cancela (2026-10-07); a TI só conversa depois de iniciar.
    pela_ana = cliente.post(f"/chamados/{n}/cancelar", headers=ana, json={"motivo": "resolvido"})
    assert pela_ana.json()["erro"]["codigo"] == "CANCELAMENTO_NAO_PERMITIDO"
    antes_de_iniciar = cliente.post(
        f"/chamados/{n}/mensagens", headers=rafael, json={"conteudo": "Oi"}
    )
    assert antes_de_iniciar.json()["erro"]["codigo"] == "CHAMADO_NAO_INICIADO"
    cancelado = cliente.post(
        f"/chamados/{n}/cancelar", headers=rafael, json={"motivo": "resolvido"}
    )
    assert cancelado.json()["status"] == "cancelado"


@pytest.mark.skipif(
    not os.getenv("SUPABASE_SERVICE_ROLE_KEY"), reason="sem SUPABASE_SERVICE_ROLE_KEY"
)
def test_anexo_sobe_direto_ao_storage_e_so_quem_ve_o_chamado_baixa(cliente, ana, bruno, outros):
    upload = cliente.post(
        "/anexos/upload-url",
        headers=ana,
        json={"nome": "print-20261006-090000.png", "mime": "image/png", "tamanho": len(PNG)},
    )
    assert upload.status_code == 200, upload.text
    # O navegador envia direto para a URL assinada (sem passar pela API).
    enviado = httpx.put(
        upload.json()["url"], content=PNG, headers={"Content-Type": "image/png"}, timeout=10
    )
    assert enviado.status_code < 300, enviado.text

    chamado = abrir(
        cliente,
        ana,
        outros,
        anexos=[
            {
                "upload_id": upload.json()["upload_id"],
                "nome": "print-20261006-090000.png",
                "origem": "colado",
            }
        ],
    )
    [anexo] = ler("anexos", f"chamado_id=eq.{chamado['id']}", ana)
    assert anexo["path"].startswith(f"chamados/{chamado['id']}/")
    assert anexo["tamanho"] == len(PNG) and anexo["origem"] == "colado"

    url = cliente.get(f"/anexos/{anexo['id']}/url", headers=ana)
    assert url.status_code == 200, url.text
    assert httpx.get(url.json()["url"], timeout=10).content == PNG
    negado = cliente.get(f"/anexos/{anexo['id']}/url", headers=bruno)
    assert negado.json()["erro"]["codigo"] == "SEM_PERMISSAO"
