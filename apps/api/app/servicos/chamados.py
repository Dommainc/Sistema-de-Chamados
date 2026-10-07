"""Regras de negócio dos chamados (etapas 1B/1C do lado da API).

Cada função recebe um Repositorio (lê como o usuário, grava como a API — numa transação só) e, quando há
arquivos, o Armazenamento. O comportamento espelha o modo simulado do front
(apps/web/lib/dados/simulada/index.ts): mesmas regras, mesmo histórico, mesmos avisos.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

from app.dominio.anexos import (
    caminho_definitivo,
    caminho_temporario,
    e_do_usuario,
    validar_arquivo,
)
from app.dominio.estados import (
    AcaoChamado,
    Ator,
    ChamadoParaTransicao,
    DadosAcao,
    acoes_disponiveis,
    validar_acao,
)
from app.dominio.formulario import validar_formulario
from app.dominio.tipos import ROTULOS, Prioridade, esta_encerrado, nao_iniciado
from app.erros.catalogo import ErroApp, ErroDeCampo, mensagem_erro
from app.integracoes.storage import Armazenamento, InfoArquivo
from app.repositorios.base import (
    AnexoLinha,
    ChamadoLinha,
    MensagemCriada,
    NovaNotificacao,
    NovaTransferencia,
    NovoAnexo,
    NovoEvento,
    PerfilLinha,
    Repositorio,
)

#: Evento do histórico gravado por cada ação (publico=False: só a TI vê).
EVENTO_DA_ACAO: dict[AcaoChamado, tuple[str, bool]] = {
    "assumir": ("assumido", True),
    "aguardar_usuario": ("status_alterado", True),
    "retomar": ("status_alterado", True),
    "resposta_solicitante": ("status_alterado", True),
    "transferir": ("transferido", False),
    "devolver_fila": ("devolvido_fila", False),
    "concluir": ("concluido", True),
    "cancelar": ("cancelado", True),
}


@dataclass(frozen=True)
class UploadInformado:
    """Arquivo já enviado ao Storage com a URL assinada (upload_id = caminho temporário)."""

    upload_id: str
    nome: str
    origem: str = "upload"


# ------------------------------------------------------------------------------------- apoio
async def _eu(repo: Repositorio) -> PerfilLinha:
    perfil = await repo.obter_meu_perfil()
    if perfil is None or not perfil.ativo:
        raise ErroApp("SEM_PERMISSAO", detalhe="perfil inexistente ou inativo")
    return perfil


async def _chamado_visivel(repo: Repositorio, eu: PerfilLinha, chamado_id: int) -> ChamadoLinha:
    """Solicitante: inexistente e alheio dão o MESMO erro (não revela quais números existem)."""
    chamado = await repo.obter_chamado(chamado_id)
    if chamado is not None:
        return chamado
    if eu.papel == "ti":
        raise ErroApp("CHAMADO_NAO_ENCONTRADO", {"numero": str(chamado_id)})
    raise ErroApp("SEM_PERMISSAO")


def _para_transicao(chamado: ChamadoLinha) -> ChamadoParaTransicao:
    return ChamadoParaTransicao(chamado.status, chamado.responsavel_id, chamado.solicitante_id)


def _aviso(chamado: ChamadoLinha, destinatario: str, tipo: str, **extra: str) -> NovaNotificacao:
    payload = {
        "numero": str(chamado.id),
        "titulo": chamado.titulo,
        "link": f"/chamados/{chamado.id}",
    }
    return NovaNotificacao(chamado.id, destinatario, tipo, {**payload, **extra})


async def _confirmar_uploads(
    storage: Armazenamento, eu: PerfilLinha, uploads: list[UploadInformado]
) -> list[tuple[UploadInformado, InfoArquivo]]:
    """Confere no Storage se cada arquivo existe, é do próprio usuário e respeita tamanho/tipo REAIS."""
    confirmados = []
    for upload in uploads:
        if not e_do_usuario(upload.upload_id, eu.id):
            raise ErroApp("UPLOAD_FALHOU", detalhe="upload de outro usuário ou caminho inválido")
        info = await storage.informacoes(upload.upload_id)
        if info is None:
            raise ErroApp("UPLOAD_FALHOU", detalhe=f"arquivo não encontrado: {upload.upload_id}")
        validar_arquivo(info.tamanho, info.mime)
        confirmados.append((upload, info))
    return confirmados


async def _guardar_anexos(
    repo: Repositorio,
    storage: Armazenamento,
    eu: PerfilLinha,
    chamado_id: int,
    mensagem_id: int | None,
    confirmados: list[tuple[UploadInformado, InfoArquivo]],
) -> list[AnexoLinha]:
    novos = []
    for upload, info in confirmados:
        destino = caminho_definitivo(chamado_id, upload.upload_id)
        await storage.mover(upload.upload_id, destino)
        novos.append(
            NovoAnexo(
                chamado_id=chamado_id,
                mensagem_id=mensagem_id,
                path=destino,
                nome=upload.nome[:255] or "arquivo",
                mime=info.mime,
                tamanho=info.tamanho,
                origem="colado" if upload.origem == "colado" else "upload",
                enviado_por=eu.id,
            )
        )
    return await repo.inserir_anexos(novos) if novos else []


#: Prazo mais distante aceito (evita data digitada errada, ex.: 2062).
PRAZO_MAXIMO = timedelta(days=366)


# ------------------------------------------------------------------------------------- rotas


async def criar_upload(
    repo: Repositorio, storage: Armazenamento, nome: str, mime: str, tamanho: int
) -> tuple[str, str]:
    """Valida o arquivo ANTES do envio e devolve (upload_id, URL assinada de upload)."""
    eu = await _eu(repo)
    validar_arquivo(tamanho, mime)
    caminho = caminho_temporario(eu.id, nome)
    return caminho, await storage.criar_url_upload(caminho)


async def abrir_chamado(
    repo: Repositorio,
    storage: Armazenamento,
    categoria_id: int,
    titulo: str,
    respostas: dict[str, object],
    uploads: list[UploadInformado],
) -> ChamadoLinha:
    eu = await _eu(repo)
    categoria = await repo.obter_categoria_ativa(categoria_id)
    if categoria is None:
        raise ErroApp("ERRO_INESPERADO", detalhe=f"categoria {categoria_id} inativa ou inexistente")
    formulario = validar_formulario(await repo.listar_campos_form(categoria_id), titulo, respostas)
    confirmados = await _confirmar_uploads(storage, eu, uploads)

    chamado = await repo.inserir_chamado(
        formulario.titulo, categoria_id, eu.id, dict(formulario.respostas)
    )
    await _guardar_anexos(repo, storage, eu, chamado.id, None, confirmados)
    await repo.inserir_eventos(
        [NovoEvento(chamado.id, eu.id, "criado", None, "pendente", {}, True)]
    )
    # Avisos: o solicitante e cada técnico ativo (docs/escopo.md 7.5).
    destinatarios = dict.fromkeys([eu.id, *await repo.listar_tecnicos_ativos()])
    await repo.inserir_notificacoes([_aviso(chamado, d, "chamado_aberto") for d in destinatarios])
    return chamado


async def acoes(repo: Repositorio, chamado_id: int) -> list[AcaoChamado]:
    eu = await _eu(repo)
    chamado = await _chamado_visivel(repo, eu, chamado_id)
    return acoes_disponiveis(_para_transicao(chamado), Ator(eu.id, eu.papel))


async def executar_acao(
    repo: Repositorio, chamado_id: int, acao: AcaoChamado, dados: DadosAcao | None = None
) -> ChamadoLinha:
    dados = dados or DadosAcao()
    eu = await _eu(repo)
    if acao == "resposta_solicitante":
        raise ErroApp("SEM_PERMISSAO", detalhe="automática: só acontece ao responder no chat")
    chamado = await _chamado_visivel(repo, eu, chamado_id)
    resultado = validar_acao(_para_transicao(chamado), acao, Ator(eu.id, eu.papel), dados)

    if acao == "transferir" and resultado.responsavel_id not in await repo.listar_tecnicos_ativos():
        raise ErroApp("CAMPO_OBRIGATORIO", {"campo": "Técnico de destino"})

    motivo = (dados.motivo or "").strip() or None
    atualizado = await repo.atualizar_chamado(
        chamado.id,
        resultado.para,
        resultado.responsavel_id,
        motivo if resultado.para == "cancelado" else None,
    )

    acao_historico, publico = EVENTO_DA_ACAO[acao]
    detalhe: dict[str, str] = {"motivo": motivo} if motivo else {}
    if acao == "transferir" and resultado.responsavel_id:
        detalhe["para_responsavel_id"] = resultado.responsavel_id
    await repo.inserir_eventos(
        [
            NovoEvento(
                chamado.id, eu.id, acao_historico, chamado.status, resultado.para, detalhe, publico
            )
        ]
    )
    if acao in ("transferir", "devolver_fila") and motivo:
        await repo.inserir_transferencia(
            NovaTransferencia(
                chamado.id,
                chamado.responsavel_id,
                resultado.responsavel_id,
                chamado.area_id,
                motivo,
                eu.id,
            )
        )

    # Avisos: o solicitante (ou, se foi ele quem agiu, o responsável) e o técnico de destino.
    tipo = {"assumir": "chamado_assumido", "transferir": "chamado_transferido"}.get(
        acao, "status_alterado"
    )
    mudanca = {"de": chamado.status, "para": resultado.para}
    avisos = []
    if chamado.solicitante_id != eu.id:
        avisos.append(_aviso(atualizado, chamado.solicitante_id, tipo, **mudanca))
    elif chamado.responsavel_id and chamado.responsavel_id != eu.id:
        avisos.append(_aviso(atualizado, chamado.responsavel_id, tipo, **mudanca))
    if acao == "transferir" and resultado.responsavel_id:
        avisos.append(
            _aviso(atualizado, resultado.responsavel_id, "chamado_transferido", **mudanca)
        )
    await repo.inserir_notificacoes(avisos)
    return atualizado


async def definir_prazo(
    repo: Repositorio, chamado_id: int, prazo: datetime, motivo: str | None
) -> ChamadoLinha:
    """Prazo para concluir, definido por um técnico (docs/adr/0009).

    1ª vez: sem motivo. Alteração: motivo obrigatório. Grava histórico (público: o solicitante vê a
    nova previsão e o motivo) e avisa o solicitante, na mesma transação.
    """
    eu = await _eu(repo)
    chamado = await _chamado_visivel(repo, eu, chamado_id)
    if eu.papel != "ti":
        raise ErroApp("SEM_PERMISSAO", detalhe="só a TI define o prazo")
    if esta_encerrado(chamado.status):
        rotulo = ROTULOS["ti"][chamado.status]
        raise ErroApp(
            "TRANSICAO_INVALIDA", {"de": rotulo, "para": rotulo}, detalhe="prazo de encerrado"
        )
    if nao_iniciado(chamado.status):
        raise ErroApp("CHAMADO_NAO_INICIADO")
    agora = await repo.agora()
    if prazo.tzinfo is None or not agora < prazo <= agora + PRAZO_MAXIMO:
        raise ErroApp("PRAZO_INVALIDO", detalhe=f"prazo {prazo.isoformat()}")
    motivo = (motivo or "").strip() or None
    anterior = chamado.prazo_sla
    if anterior is not None and not motivo:
        raise ErroApp("MOTIVO_OBRIGATORIO")

    atualizado = await repo.definir_prazo(chamado.id, prazo)
    detalhe = {"prazo": prazo.isoformat()}
    if anterior is not None:
        detalhe["prazo_anterior"] = anterior.isoformat()
    if motivo:
        detalhe["motivo"] = motivo
    await repo.inserir_eventos(
        [
            NovoEvento(
                chamado.id, eu.id, "prazo_definido", chamado.status, chamado.status, detalhe, True
            )
        ]
    )
    if chamado.solicitante_id != eu.id:
        await repo.inserir_notificacoes(
            [_aviso(atualizado, chamado.solicitante_id, "prazo_definido", **detalhe)]
        )
    return atualizado


async def definir_prioridade(
    repo: Repositorio, chamado_id: int, prioridade: Prioridade
) -> ChamadoLinha:
    """Prioridade (Alta, Média, Baixa) — só TI, depois de iniciar; só a TI vê (ADR 0012).

    Grava no histórico interno (publico = False). Não avisa o solicitante.
    """
    eu = await _eu(repo)
    chamado = await _chamado_visivel(repo, eu, chamado_id)
    if eu.papel != "ti":
        raise ErroApp("SEM_PERMISSAO", detalhe="só a TI define a prioridade")
    if esta_encerrado(chamado.status):
        rotulo = ROTULOS["ti"][chamado.status]
        raise ErroApp(
            "TRANSICAO_INVALIDA", {"de": rotulo, "para": rotulo}, detalhe="prioridade de encerrado"
        )
    if nao_iniciado(chamado.status):
        raise ErroApp("CHAMADO_NAO_INICIADO")
    if chamado.prioridade == prioridade:
        return chamado
    atualizado = await repo.definir_prioridade(chamado.id, prioridade)
    await repo.inserir_eventos(
        [
            NovoEvento(
                chamado.id,
                eu.id,
                "prioridade_alterada",
                chamado.status,
                chamado.status,
                {"de": chamado.prioridade, "para": prioridade},
                False,
            )
        ]
    )
    return atualizado


async def enviar_mensagem(
    repo: Repositorio,
    storage: Armazenamento,
    chamado_id: int,
    conteudo: str,
    interna: bool,
    uploads: list[UploadInformado],
) -> MensagemCriada:
    eu = await _eu(repo)
    chamado = await _chamado_visivel(repo, eu, chamado_id)
    if esta_encerrado(chamado.status):
        raise ErroApp(
            "TRANSICAO_INVALIDA",
            {"de": ROTULOS[eu.papel][chamado.status], "para": ROTULOS[eu.papel]["em_andamento"]},
        )
    if interna and eu.papel != "ti":
        raise ErroApp("SEM_PERMISSAO", detalhe="nota interna é só da TI")
    # A TI só mexe no chamado depois de iniciar: nem conversa, nem relato (ADR 0011 e 0012).
    if eu.papel == "ti" and nao_iniciado(chamado.status):
        raise ErroApp("CHAMADO_NAO_INICIADO")
    texto = conteudo.strip()
    if not texto and not uploads:
        raise ErroApp(
            "CAMPO_OBRIGATORIO",
            {"campo": "Mensagem"},
            campos=[ErroDeCampo("conteudo", mensagem_erro("CAMPO_OBRIGATORIO", campo="Mensagem"))],
        )
    confirmados = await _confirmar_uploads(storage, eu, uploads)

    mensagem = await repo.inserir_mensagem(chamado.id, eu.id, texto[:10_000], interna)
    await _guardar_anexos(repo, storage, eu, chamado.id, mensagem.id, confirmados)

    # Resposta do solicitante em "aguardando_usuario" volta o chamado para "em_andamento".
    atualizado = chamado
    if chamado.status == "aguardando_usuario" and chamado.solicitante_id == eu.id:
        resultado = validar_acao(
            _para_transicao(chamado), "resposta_solicitante", Ator(eu.id, eu.papel)
        )
        atualizado = await repo.atualizar_chamado(
            chamado.id, resultado.para, resultado.responsavel_id, None
        )
        await repo.inserir_eventos(
            [
                NovoEvento(
                    chamado.id,
                    None,
                    "status_alterado",
                    chamado.status,
                    resultado.para,
                    {"motivo": "resposta_do_solicitante"},
                    True,
                )
            ]
        )

    # Mensagem não interna avisa a outra parte: solicitante ↔ responsável (sem responsável → TI).
    if not interna:
        if eu.id == chamado.solicitante_id:
            destinatarios = (
                [chamado.responsavel_id]
                if chamado.responsavel_id
                else await repo.listar_tecnicos_ativos()
            )
        else:
            destinatarios = [chamado.solicitante_id]
        await repo.inserir_notificacoes(
            [_aviso(atualizado, d, "nova_mensagem") for d in destinatarios if d != eu.id]
        )
    return mensagem


async def marcar_lido(repo: Repositorio, chamado_id: int) -> None:
    eu = await _eu(repo)
    chamado = await _chamado_visivel(repo, eu, chamado_id)
    ultima = await repo.ultima_mensagem_visivel_em(chamado.id)
    await repo.marcar_lido(chamado.id, eu.id, ultima or chamado.criado_em)


async def url_anexo(repo: Repositorio, storage: Armazenamento, anexo_id: str) -> str:
    """URL de download de 60 s — só se o usuário pode ver o anexo (RLS)."""
    await _eu(repo)
    anexo = await repo.obter_anexo(anexo_id)
    if anexo is None:
        raise ErroApp("SEM_PERMISSAO")
    return await storage.criar_url_download(anexo.path, 60)
