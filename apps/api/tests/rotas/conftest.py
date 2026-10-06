"""Cliente da API com repositório e Storage em memória (docs/adr/0008) e tokens HS256 de teste."""

from __future__ import annotations

import time
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi.testclient import TestClient

from app.auth import UsuarioAutenticado, VerificadorJwt, obter_verificador
from app.dependencias import obter_armazenamento, obter_fabrica_repositorio
from app.dominio.formulario import CampoForm
from app.integracoes.storage import ArmazenamentoMemoria
from app.main import criar_app
from app.repositorios.base import CategoriaLinha, ChamadoLinha, PerfilLinha
from app.repositorios.memoria import EstadoMemoria, MensagemMemoria, RepositorioMemoria

SEGREDO = "segredo-de-teste-com-tamanho-suficiente-123456"

ANA = "aaaaaaaa-0000-0000-0000-000000000001"
BRUNO = "bbbbbbbb-0000-0000-0000-000000000002"
RAFAEL = "cccccccc-0000-0000-0000-000000000003"
THIAGO = "dddddddd-0000-0000-0000-000000000004"
INATIVO = "eeeeeeee-0000-0000-0000-000000000005"

INTERNET = 2
OUTROS = 13


def _chamado(id_: int, solicitante: str, status, responsavel=None, horas_atras=2) -> ChamadoLinha:
    criado = datetime(2026, 10, 6, 12, 0, tzinfo=UTC) - timedelta(hours=horas_atras)
    return ChamadoLinha(
        id=id_,
        titulo=f"Chamado de exemplo {id_}",
        categoria_id=OUTROS,
        area_id=1,
        solicitante_id=solicitante,
        responsavel_id=responsavel,
        status=status,
        prazo_sla=criado + timedelta(hours=8),
        criado_em=criado,
        atualizado_em=criado,
    )


@pytest.fixture
def estado() -> EstadoMemoria:
    e = EstadoMemoria()
    e.perfis = {
        ANA: PerfilLinha(ANA, "Ana Souza", "solicitante", True),
        BRUNO: PerfilLinha(BRUNO, "Bruno Teixeira", "solicitante", True),
        RAFAEL: PerfilLinha(RAFAEL, "Rafael Lima", "ti", True),
        THIAGO: PerfilLinha(THIAGO, "Thiago Martins", "ti", True),
        INATIVO: PerfilLinha(INATIVO, "Desligado", "solicitante", False),
    }
    e.categorias = {
        INTERNET: CategoriaLinha(INTERNET, "Internet, rede ou VPN", 2, 1),
        OUTROS: CategoriaLinha(OUTROS, "Outros", 16, 1),
    }
    e.campos = {
        INTERNET: [
            CampoForm("alcance", "Quem está sem conexão?", "selecao", True, ["Só eu", "Todos"], 10),
            CampoForm("local", "Onde você está?", "texto", True, [], 20),
            CampoForm("descricao", "Descreva o que está acontecendo", "texto_longo", True, [], 100),
        ],
        OUTROS: [CampoForm("descricao", "Descreva", "texto_longo", True, [], 100)],
    }
    e.chamados = {
        35: _chamado(35, ANA, "concluido", RAFAEL, 72),
        36: _chamado(36, BRUNO, "pendente"),
        39: _chamado(39, BRUNO, "transferido", RAFAEL),
        41: _chamado(41, ANA, "aguardando_usuario", RAFAEL),
        42: _chamado(42, ANA, "pendente"),
    }
    e.mensagens = [
        MensagemMemoria(1, 41, RAFAEL, "Caixa cheia", True, e.relogio - timedelta(minutes=20)),
        MensagemMemoria(
            2, 41, RAFAEL, "Consegue testar?", False, e.relogio - timedelta(minutes=12)
        ),
    ]
    return e


@pytest.fixture
def storage() -> ArmazenamentoMemoria:
    return ArmazenamentoMemoria()


@pytest.fixture
def cliente(estado: EstadoMemoria, storage: ArmazenamentoMemoria) -> TestClient:
    app = criar_app()

    def fabrica():
        @asynccontextmanager
        async def abrir(usuario: UsuarioAutenticado) -> AsyncIterator[RepositorioMemoria]:
            yield RepositorioMemoria(estado, usuario.id)

        return abrir

    app.dependency_overrides[obter_verificador] = lambda: VerificadorJwt(
        audience="authenticated", segredo=SEGREDO
    )
    app.dependency_overrides[obter_fabrica_repositorio] = fabrica
    app.dependency_overrides[obter_armazenamento] = lambda: storage
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def como() -> Callable[[str], dict[str, str]]:
    """Cabeçalho Authorization para o usuário: `cliente.post(..., headers=como(ANA))`."""

    def cabecalho(usuario_id: str) -> dict[str, str]:
        agora = int(time.time())
        token = jwt.encode(
            {"sub": usuario_id, "aud": "authenticated", "exp": agora + 600, "iat": agora},
            SEGREDO,
            algorithm="HS256",
        )
        return {"Authorization": f"Bearer {token}"}

    return cabecalho
