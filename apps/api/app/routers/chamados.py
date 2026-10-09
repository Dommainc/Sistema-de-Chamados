"""Rotas de chamados, mensagens e anexos (contrato do front: apps/web/lib/dados/tipos.ts, P-028).

As LISTAGENS (meus chamados, quadro, conversa) não passam por aqui: o front lê direto do Supabase com
o RLS filtrando (docs/adr/0002). Aqui ficam as AÇÕES, sempre numa transação única.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Literal

from fastapi import APIRouter, Response
from pydantic import BaseModel, Field

from app.auth import UsuarioAtual
from app.dependencias import Fabrica, Storage
from app.dominio.estados import AcaoChamado, DadosAcao
from app.dominio.tipos import Prioridade, StatusChamado
from app.erros.catalogo import ErroApp
from app.erros.respostas import RESPOSTAS_COM_LOGIN
from app.repositorios.base import ChamadoLinha
from app.servicos import chamados as servicos
from app.servicos.chamados import UploadInformado

router = APIRouter(tags=["chamados"], responses=RESPOSTAS_COM_LOGIN)

_UUID = re.compile(
    r"^[0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12}$"
)


# ------------------------------------------------------------------------------------ modelos
class UploadEntrada(BaseModel):
    upload_id: str = Field(description="Devolvido por POST /anexos/upload-url")
    nome: str = Field(min_length=1, max_length=255)
    origem: Literal["upload", "colado"] = "upload"

    def para_servico(self) -> UploadInformado:
        return UploadInformado(self.upload_id, self.nome, self.origem)


class NovoChamadoEntrada(BaseModel):
    categoria_id: int
    titulo: str = Field(default="", description='"Resumo do problema"')
    respostas: dict[str, Any] = Field(default_factory=dict, description="Por campos_form.chave")
    anexos: list[UploadEntrada] = Field(default_factory=list, max_length=20)


class ChamadoSaida(BaseModel):
    id: int
    titulo: str
    status: StatusChamado
    prioridade: str
    responsavel_id: str | None
    prazo_sla: datetime | None = Field(description="Definido pela TI; null = ainda sem prazo")
    criado_em: datetime
    atualizado_em: datetime

    @classmethod
    def de(cls, chamado: ChamadoLinha) -> ChamadoSaida:
        return cls(
            id=chamado.id,
            titulo=chamado.titulo,
            status=chamado.status,
            prioridade=chamado.prioridade,
            responsavel_id=chamado.responsavel_id,
            prazo_sla=chamado.prazo_sla,
            criado_em=chamado.criado_em,
            atualizado_em=chamado.atualizado_em,
        )


class AcoesSaida(BaseModel):
    acoes: list[AcaoChamado]


class MotivoEntrada(BaseModel):
    motivo: str = ""


class TransferirEntrada(BaseModel):
    destino_id: str | None = None
    motivo: str = ""


class MensagemEntrada(BaseModel):
    conteudo: str = Field(default="", max_length=10_000)
    interna: bool = False
    anexos: list[UploadEntrada] = Field(default_factory=list, max_length=20)


class MensagemSaida(BaseModel):
    id: int
    criado_em: datetime


class UploadUrlEntrada(BaseModel):
    nome: str = Field(min_length=1, max_length=255)
    mime: str
    tamanho: int = Field(gt=0)


class UploadUrlSaida(BaseModel):
    upload_id: str
    url: str


class PrioridadeEntrada(BaseModel):
    prioridade: Prioridade = Field(description="alta · media · baixa")


class AvaliacaoEntrada(BaseModel):
    nota: int = Field(ge=1, le=5, description="1 a 5 estrelas")
    comentario: str | None = Field(
        default=None, max_length=2000, description="Obrigatório com nota 1 ou 2"
    )


class AvaliacaoSaida(BaseModel):
    chamado_id: int
    nota: int
    comentario: str | None
    criado_em: datetime


class PrazoEntrada(BaseModel):
    prazo: datetime = Field(description="Data e hora com fuso, no futuro (até 1 ano)")
    motivo: str = Field(default="", description="Obrigatório ao ALTERAR um prazo já definido")


class UrlSaida(BaseModel):
    url: str


# ---------------------------------------------------------------------------------- anexos
@router.post("/anexos/upload-url", summary="Valida o arquivo e devolve a URL assinada de upload")
async def criar_upload(
    dados: UploadUrlEntrada, usuario: UsuarioAtual, fabrica: Fabrica, storage: Storage
) -> UploadUrlSaida:
    async with fabrica(usuario) as repo:
        upload_id, url = await servicos.criar_upload(
            repo, storage, dados.nome, dados.mime, dados.tamanho
        )
    return UploadUrlSaida(upload_id=upload_id, url=url)


@router.get("/anexos/{anexo_id}/url", summary="URL de download (60 s), se você pode ver o anexo")
async def url_anexo(
    anexo_id: str, usuario: UsuarioAtual, fabrica: Fabrica, storage: Storage
) -> UrlSaida:
    if not _UUID.match(anexo_id):
        raise ErroApp("SEM_PERMISSAO", detalhe="id de anexo inválido")
    async with fabrica(usuario) as repo:
        return UrlSaida(url=await servicos.url_anexo(repo, storage, anexo_id))


# -------------------------------------------------------------------------------- chamados
@router.post("/chamados", status_code=201, summary="Abrir chamado")
async def abrir_chamado(
    dados: NovoChamadoEntrada, usuario: UsuarioAtual, fabrica: Fabrica, storage: Storage
) -> ChamadoSaida:
    async with fabrica(usuario) as repo:
        chamado = await servicos.abrir_chamado(
            repo,
            storage,
            dados.categoria_id,
            dados.titulo,
            dados.respostas,
            [a.para_servico() for a in dados.anexos],
        )
    return ChamadoSaida.de(chamado)


@router.get("/chamados/{chamado_id}/acoes", summary="Ações permitidas agora (botões do front)")
async def acoes(chamado_id: int, usuario: UsuarioAtual, fabrica: Fabrica) -> AcoesSaida:
    async with fabrica(usuario) as repo:
        return AcoesSaida(acoes=await servicos.acoes(repo, chamado_id))


async def _acao(
    fabrica: Fabrica,
    usuario: UsuarioAtual,
    chamado_id: int,
    acao: AcaoChamado,
    dados: DadosAcao | None = None,
) -> ChamadoSaida:
    async with fabrica(usuario) as repo:
        return ChamadoSaida.de(await servicos.executar_acao(repo, chamado_id, acao, dados))


@router.post("/chamados/{chamado_id}/assumir", summary="Assumir (TI)")
async def assumir(chamado_id: int, usuario: UsuarioAtual, fabrica: Fabrica) -> ChamadoSaida:
    return await _acao(fabrica, usuario, chamado_id, "assumir")


@router.post("/chamados/{chamado_id}/concluir", summary="Concluir (TI) — final, sem reabertura")
async def concluir(chamado_id: int, usuario: UsuarioAtual, fabrica: Fabrica) -> ChamadoSaida:
    return await _acao(fabrica, usuario, chamado_id, "concluir")


@router.post("/chamados/{chamado_id}/transferir", summary="Transferir para outro técnico (TI)")
async def transferir(
    chamado_id: int, dados: TransferirEntrada, usuario: UsuarioAtual, fabrica: Fabrica
) -> ChamadoSaida:
    return await _acao(
        fabrica,
        usuario,
        chamado_id,
        "transferir",
        DadosAcao(motivo=dados.motivo, destino_id=dados.destino_id),
    )


@router.post("/chamados/{chamado_id}/cancelar", summary="Cancelar com motivo")
async def cancelar(
    chamado_id: int, dados: MotivoEntrada, usuario: UsuarioAtual, fabrica: Fabrica
) -> ChamadoSaida:
    return await _acao(fabrica, usuario, chamado_id, "cancelar", DadosAcao(motivo=dados.motivo))


@router.post(
    "/chamados/{chamado_id}/prioridade", summary="Definir a prioridade (TI, depois de iniciar)"
)
async def definir_prioridade(
    chamado_id: int, dados: PrioridadeEntrada, usuario: UsuarioAtual, fabrica: Fabrica
) -> ChamadoSaida:
    async with fabrica(usuario) as repo:
        return ChamadoSaida.de(
            await servicos.definir_prioridade(repo, chamado_id, dados.prioridade)
        )


@router.post(
    "/chamados/{chamado_id}/avaliacao",
    status_code=201,
    summary="Avaliar o atendimento (solicitante, depois de concluído — ADR 0015)",
)
async def avaliar(
    chamado_id: int, dados: AvaliacaoEntrada, usuario: UsuarioAtual, fabrica: Fabrica
) -> AvaliacaoSaida:
    async with fabrica(usuario) as repo:
        a = await servicos.avaliar(repo, chamado_id, dados.nota, dados.comentario)
        return AvaliacaoSaida(
            chamado_id=a.chamado_id, nota=a.nota, comentario=a.comentario, criado_em=a.criado_em
        )


@router.post("/chamados/{chamado_id}/prazo", summary="Definir ou alterar o prazo (TI)")
async def definir_prazo(
    chamado_id: int, dados: PrazoEntrada, usuario: UsuarioAtual, fabrica: Fabrica
) -> ChamadoSaida:
    async with fabrica(usuario) as repo:
        return ChamadoSaida.de(
            await servicos.definir_prazo(repo, chamado_id, dados.prazo, dados.motivo)
        )


# ------------------------------------------------------------------------------- mensagens
@router.post("/chamados/{chamado_id}/mensagens", status_code=201, summary="Enviar mensagem")
async def enviar_mensagem(
    chamado_id: int,
    dados: MensagemEntrada,
    usuario: UsuarioAtual,
    fabrica: Fabrica,
    storage: Storage,
) -> MensagemSaida:
    async with fabrica(usuario) as repo:
        mensagem = await servicos.enviar_mensagem(
            repo,
            storage,
            chamado_id,
            dados.conteudo,
            dados.interna,
            [a.para_servico() for a in dados.anexos],
        )
    return MensagemSaida(id=mensagem.id, criado_em=mensagem.criado_em)


@router.post("/chamados/{chamado_id}/lido", status_code=204, summary="Marcar a conversa como lida")
async def marcar_lido(chamado_id: int, usuario: UsuarioAtual, fabrica: Fabrica) -> Response:
    async with fabrica(usuario) as repo:
        await servicos.marcar_lido(repo, chamado_id)
    return Response(status_code=204)
