"""Repositório em memória — SÓ PARA TESTES (docs/adr/0008).

Imita o que o banco garante para cada usuário (RLS das migrations 0010/0017): TI vê todos os chamados;
solicitante só os próprios; nota interna e seus anexos não existem para o solicitante.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field, replace
from datetime import UTC, datetime, timedelta
from typing import Any

from app.dominio.formulario import CampoForm
from app.dominio.tipos import StatusChamado
from app.repositorios.base import (
    AnexoLinha,
    CategoriaLinha,
    ChamadoLinha,
    MensagemCriada,
    NovaNotificacao,
    NovaTransferencia,
    NovoAnexo,
    NovoEvento,
    PerfilLinha,
)


@dataclass
class MensagemMemoria:
    id: int
    chamado_id: int
    autor_id: str
    conteudo: str
    interna: bool
    criado_em: datetime


@dataclass
class EstadoMemoria:
    """O "banco" dos testes, compartilhado entre os usuários."""

    perfis: dict[str, PerfilLinha] = field(default_factory=dict)
    categorias: dict[int, CategoriaLinha] = field(default_factory=dict)
    campos: dict[int, list[CampoForm]] = field(default_factory=dict)
    chamados: dict[int, ChamadoLinha] = field(default_factory=dict)
    mensagens: list[MensagemMemoria] = field(default_factory=list)
    anexos: list[AnexoLinha] = field(default_factory=list)
    eventos: list[NovoEvento] = field(default_factory=list)
    transferencias: list[NovaTransferencia] = field(default_factory=list)
    notificacoes: list[NovaNotificacao] = field(default_factory=list)
    leituras: dict[tuple[int, str], datetime] = field(default_factory=dict)
    relogio: datetime = field(default_factory=lambda: datetime(2026, 10, 6, 13, 0, tzinfo=UTC))

    def agora(self) -> datetime:
        # Avança 1 s por chamada: ordens e "lido até" ficam previsíveis nos testes.
        self.relogio += timedelta(seconds=1)
        return self.relogio


class RepositorioMemoria:
    def __init__(self, estado: EstadoMemoria, usuario_id: str) -> None:
        self._e = estado
        self._usuario_id = usuario_id

    # ------------------------------------------------------------------------------- visibilidade
    def _eu(self) -> PerfilLinha | None:
        return self._e.perfis.get(self._usuario_id)

    def _sou_ti(self) -> bool:
        eu = self._eu()
        return eu is not None and eu.papel == "ti" and eu.ativo

    def _vejo_chamado(self, chamado: ChamadoLinha) -> bool:
        return self._sou_ti() or chamado.solicitante_id == self._usuario_id

    def _vejo_mensagem(self, mensagem: MensagemMemoria) -> bool:
        chamado = self._e.chamados.get(mensagem.chamado_id)
        if chamado is None or not self._vejo_chamado(chamado):
            return False
        return self._sou_ti() or not mensagem.interna

    # ---------------------------------------------------------------------------------- leituras
    async def obter_meu_perfil(self) -> PerfilLinha | None:
        return self._eu()

    async def obter_chamado(self, chamado_id: int) -> ChamadoLinha | None:
        chamado = self._e.chamados.get(chamado_id)
        return chamado if chamado and self._vejo_chamado(chamado) else None

    async def obter_anexo(self, anexo_id: str) -> AnexoLinha | None:
        anexo = next((a for a in self._e.anexos if a.id == anexo_id), None)
        if anexo is None:
            return None
        chamado = self._e.chamados.get(anexo.chamado_id)
        if chamado is None or not self._vejo_chamado(chamado):
            return None
        if anexo.mensagem_id is None or self._sou_ti():
            return anexo
        mensagem = next(m for m in self._e.mensagens if m.id == anexo.mensagem_id)
        return anexo if not mensagem.interna else None

    async def ultima_mensagem_visivel_em(self, chamado_id: int) -> datetime | None:
        datas = [
            m.criado_em
            for m in self._e.mensagens
            if m.chamado_id == chamado_id and self._vejo_mensagem(m)
        ]
        return max(datas, default=None)

    async def obter_categoria_ativa(self, categoria_id: int) -> CategoriaLinha | None:
        return self._e.categorias.get(categoria_id)

    async def listar_campos_form(self, categoria_id: int) -> list[CampoForm]:
        return list(self._e.campos.get(categoria_id, []))

    async def calcular_prazo(self, sla_horas: float) -> datetime:
        # Simplificação dos testes: horas corridas (o banco usa horas úteis).
        return self._e.relogio + timedelta(hours=sla_horas)

    async def listar_tecnicos_ativos(self) -> list[str]:
        return [p.id for p in self._e.perfis.values() if p.papel == "ti" and p.ativo]

    # --------------------------------------------------------------------------------- gravações
    async def inserir_chamado(
        self, titulo: str, categoria_id: int, solicitante_id: str, respostas: dict[str, Any]
    ) -> ChamadoLinha:
        categoria = self._e.categorias[categoria_id]
        agora = self._e.agora()
        chamado = ChamadoLinha(
            id=max(self._e.chamados, default=0) + 1,
            titulo=titulo,
            categoria_id=categoria_id,
            area_id=categoria.area_id,
            solicitante_id=solicitante_id,
            responsavel_id=None,
            status="pendente",
            prazo_sla=await self.calcular_prazo(categoria.sla_horas),
            criado_em=agora,
            atualizado_em=agora,
            respostas_form=dict(respostas),
        )
        self._e.chamados[chamado.id] = chamado
        return chamado

    async def atualizar_chamado(
        self,
        chamado_id: int,
        status: StatusChamado,
        responsavel_id: str | None,
        motivo_cancelamento: str | None,
    ) -> ChamadoLinha:
        atual = self._e.chamados[chamado_id]
        agora = self._e.agora()
        novo = replace(
            atual,
            status=status,
            responsavel_id=responsavel_id,
            atualizado_em=agora,
            concluido_em=agora if status == "concluido" else atual.concluido_em,
            cancelado_em=agora if status == "cancelado" else atual.cancelado_em,
            motivo_cancelamento=motivo_cancelamento or atual.motivo_cancelamento,
        )
        self._e.chamados[chamado_id] = novo
        return novo

    async def inserir_mensagem(
        self, chamado_id: int, autor_id: str, conteudo: str, interna: bool
    ) -> MensagemCriada:
        mensagem = MensagemMemoria(
            id=len(self._e.mensagens) + 1,
            chamado_id=chamado_id,
            autor_id=autor_id,
            conteudo=conteudo,
            interna=interna,
            criado_em=self._e.agora(),
        )
        self._e.mensagens.append(mensagem)
        return MensagemCriada(mensagem.id, mensagem.criado_em)

    async def inserir_anexos(self, anexos: list[NovoAnexo]) -> list[AnexoLinha]:
        novos = [
            AnexoLinha(
                id=uuid.uuid4().hex,
                chamado_id=a.chamado_id,
                mensagem_id=a.mensagem_id,
                path=a.path,
                nome=a.nome,
                mime=a.mime,
                tamanho=a.tamanho,
            )
            for a in anexos
        ]
        self._e.anexos.extend(novos)
        return novos

    async def inserir_eventos(self, eventos: list[NovoEvento]) -> None:
        self._e.eventos.extend(eventos)

    async def inserir_transferencia(self, transferencia: NovaTransferencia) -> None:
        self._e.transferencias.append(transferencia)

    async def inserir_notificacoes(self, notificacoes: list[NovaNotificacao]) -> None:
        self._e.notificacoes.extend(notificacoes)

    async def marcar_lido(self, chamado_id: int, perfil_id: str, lido_ate: datetime) -> None:
        chave = (chamado_id, perfil_id)
        self._e.leituras[chave] = max(lido_ate, self._e.leituras.get(chave, lido_ate))
