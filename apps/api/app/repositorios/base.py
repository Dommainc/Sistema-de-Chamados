"""Contrato de acesso a dados das regras de negócio (docs/adr/0008).

Duas implementações:
- `postgres.RepositorioPostgres`: SQL de verdade; lê como o usuário (RLS) e grava como central_api,
  tudo na mesma transação (docs/adr/0002).
- `memoria.RepositorioMemoria`: só para testes; imita as regras de visibilidade do banco.

Métodos `ler_*`/`obter_*` respeitam o que o USUÁRIO pode ver. Métodos `inserir_*`/`atualizar_*` gravam
como a API, depois que o serviço já validou a regra.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Protocol

from app.dominio.formulario import CampoForm
from app.dominio.tipos import Papel, StatusChamado


@dataclass(frozen=True)
class PerfilLinha:
    id: str
    nome: str
    papel: Papel
    ativo: bool


@dataclass(frozen=True)
class CategoriaLinha:
    id: int
    nome: str
    sla_horas: float
    area_id: int


@dataclass(frozen=True)
class ChamadoLinha:
    id: int
    titulo: str
    categoria_id: int
    area_id: int
    solicitante_id: str
    responsavel_id: str | None
    status: StatusChamado
    #: Definida pela TI (ADR 0012); nasce "media".
    prioridade: str
    #: Definido por um técnico (docs/adr/0009); None = ainda sem prazo.
    prazo_sla: datetime | None
    criado_em: datetime
    atualizado_em: datetime
    concluido_em: datetime | None = None
    cancelado_em: datetime | None = None
    motivo_cancelamento: str | None = None
    respostas_form: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class AnexoLinha:
    id: str
    chamado_id: int
    mensagem_id: int | None
    path: str
    nome: str
    mime: str
    tamanho: int


@dataclass(frozen=True)
class NovoEvento:
    chamado_id: int
    autor_id: str | None
    acao: str
    de: str | None
    para: str | None
    detalhe: dict[str, str]
    publico: bool


@dataclass(frozen=True)
class NovaNotificacao:
    chamado_id: int
    destinatario_id: str
    tipo: str
    payload: dict[str, str]


@dataclass(frozen=True)
class NovoAnexo:
    chamado_id: int
    mensagem_id: int | None
    path: str
    nome: str
    mime: str
    tamanho: int
    origem: str
    enviado_por: str


@dataclass(frozen=True)
class NovaTransferencia:
    chamado_id: int
    de_responsavel_id: str | None
    para_responsavel_id: str | None
    area_id: int
    motivo: str
    autor_id: str


@dataclass(frozen=True)
class MensagemCriada:
    id: int
    criado_em: datetime


class Repositorio(Protocol):
    # ---------------------------------------------------------------- leituras (como o usuário)
    async def obter_meu_perfil(self) -> PerfilLinha | None: ...

    async def obter_chamado(self, chamado_id: int) -> ChamadoLinha | None:
        """Só devolve o chamado se o usuário pode vê-lo (RLS)."""
        ...

    async def obter_anexo(self, anexo_id: str) -> AnexoLinha | None:
        """Só devolve se o usuário pode vê-lo (anexo de nota interna some para o solicitante)."""
        ...

    async def ultima_mensagem_visivel_em(self, chamado_id: int) -> datetime | None: ...

    # ---------------------------------------------------------------- consultas de apoio (API)
    async def obter_categoria_ativa(self, categoria_id: int) -> CategoriaLinha | None: ...

    async def listar_campos_form(self, categoria_id: int) -> list[CampoForm]: ...

    async def agora(self) -> datetime:
        """Hora do banco (now()), para validar que o prazo está no futuro."""
        ...

    async def listar_tecnicos_ativos(self) -> list[str]: ...

    # ---------------------------------------------------------------- gravações (como central_api)
    async def inserir_chamado(
        self, titulo: str, categoria_id: int, solicitante_id: str, respostas: dict[str, Any]
    ) -> ChamadoLinha: ...

    async def atualizar_chamado(
        self,
        chamado_id: int,
        status: StatusChamado,
        responsavel_id: str | None,
        motivo_cancelamento: str | None,
    ) -> ChamadoLinha: ...

    async def definir_prazo(self, chamado_id: int, prazo: datetime) -> ChamadoLinha: ...

    async def definir_prioridade(self, chamado_id: int, prioridade: str) -> ChamadoLinha: ...

    async def inserir_mensagem(
        self, chamado_id: int, autor_id: str, conteudo: str, interna: bool
    ) -> MensagemCriada: ...

    async def inserir_anexos(self, anexos: list[NovoAnexo]) -> list[AnexoLinha]: ...

    async def inserir_eventos(self, eventos: list[NovoEvento]) -> None: ...

    async def inserir_transferencia(self, transferencia: NovaTransferencia) -> None: ...

    async def inserir_notificacoes(self, notificacoes: list[NovaNotificacao]) -> None: ...

    async def marcar_lido(self, chamado_id: int, perfil_id: str, lido_ate: datetime) -> None: ...
