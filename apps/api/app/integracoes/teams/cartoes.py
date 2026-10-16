"""Texto e Adaptive Card de cada aviso (docs/fases/1E-teams.md). Funções puras: fáceis de testar e de mudar.

O texto depende do tipo do aviso e de quem recebe (solicitante ou TI). Linguagem simples, sem termos técnicos.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from app.dominio.tipos import ROTULOS

FUSO = ZoneInfo("America/Sao_Paulo")
LIMITE_TRECHO = 200


@dataclass(frozen=True)
class DadosAviso:
    """O que o processador junta do banco para montar o cartão."""

    tipo: str
    payload: dict[str, Any]
    chamado_id: int
    titulo: str
    status: str
    #: O destinatário é o solicitante do chamado (senão, alguém da TI).
    para_solicitante: bool
    solicitante_nome: str
    responsavel_nome: str | None
    prazo: datetime | None
    motivo_cancelamento: str | None
    #: Última mensagem (não interna) de outra pessoa, para "Rafael respondeu: ...".
    ultima_mensagem: str | None
    #: Motivo da transferência (último registro).
    motivo_transferencia: str | None


@dataclass(frozen=True)
class Aviso:
    texto: str
    #: Detalhe opcional (trecho da mensagem, motivo).
    detalhe: str | None = None
    botao: str = "Abrir chamado"


def _primeiro(nome: str | None) -> str:
    return nome.split(" ")[0] if nome else ""


def _trecho(texto: str | None) -> str | None:
    if not texto:
        return None
    texto = " ".join(texto.split())
    return texto if len(texto) <= LIMITE_TRECHO else texto[: LIMITE_TRECHO - 1].rstrip() + "…"


def _quando(data: datetime) -> str:
    return data.astimezone(FUSO).strftime("%d/%m às %H:%M")


def montar_aviso(d: DadosAviso) -> Aviso:
    n = f"#{d.chamado_id}"
    tecnico = d.responsavel_nome or "A TI"
    para = d.payload.get("para")

    if d.tipo == "chamado_aberto":
        if d.para_solicitante:
            return Aviso(f"Recebemos seu chamado {n}. A TI já foi avisada e logo começa a atender.")
        return Aviso(f"Chamado novo {n}, aberto por {d.solicitante_nome}.")

    if d.tipo == "chamado_assumido":
        return Aviso(f"{tecnico} começou a atender seu chamado {n}.")

    if d.tipo == "chamado_transferido":
        if d.para_solicitante:
            return Aviso(
                f"Seu chamado {n} foi passado para {tecnico}, que vai continuar o atendimento."
            )
        return Aviso(
            f"O chamado {n} foi transferido para você.",
            detalhe=_trecho(f"Motivo: {d.motivo_transferencia}")
            if d.motivo_transferencia
            else None,
        )

    if d.tipo == "nova_mensagem":
        quem = tecnico if d.para_solicitante else _primeiro(d.solicitante_nome) or "O solicitante"
        sufixo = f"no seu chamado {n}" if d.para_solicitante else f"no chamado {n}"
        return Aviso(
            f"{quem} respondeu {sufixo}.",
            detalhe=_trecho(f"“{_trecho(d.ultima_mensagem)}”") if d.ultima_mensagem else None,
            botao="Responder",
        )

    if d.tipo == "status_alterado":
        if para == "aguardando_usuario":
            return Aviso(
                f"O chamado {n} está esperando sua resposta há 2 horas. "
                "Responda no chat da Central para continuarmos.",
                botao="Responder",
            )
        if para == "concluido":
            return Aviso(
                f"Seu chamado {n} foi concluído. Como foi o atendimento?",
                botao="Avaliar",
            )
        if para == "cancelado":
            motivo = d.motivo_cancelamento or d.payload.get("motivo")
            return Aviso(
                f"Seu chamado {n} foi cancelado.",
                detalhe=_trecho(f"Motivo: {motivo}") if motivo else None,
            )
        papel = "solicitante" if d.para_solicitante else "ti"
        rotulo = ROTULOS[papel].get(str(para or d.status), str(para or d.status))
        return Aviso(f"O chamado {n} agora está: {rotulo}.")

    if d.tipo == "prazo_definido":
        texto = f"Previsão de conclusão do seu chamado {n}"
        texto += f": {_quando(d.prazo)}." if d.prazo else " atualizada."
        motivo = d.payload.get("motivo")
        return Aviso(texto, detalhe=_trecho(f"Motivo: {motivo}") if motivo else None)

    if d.tipo == "aviso_inatividade":
        return Aviso(
            f"A TI ainda está esperando sua resposta no chamado {n}. "
            "Se o problema já foi resolvido, é só avisar no chat.",
            botao="Responder",
        )

    return Aviso(f"Novidade no chamado {n}.")


def cartao(d: DadosAviso, link: str) -> dict[str, Any]:
    """Atividade do Bot Framework com o Adaptive Card do aviso."""
    aviso = montar_aviso(d)
    corpo: list[dict[str, Any]] = [
        {
            "type": "TextBlock",
            "text": f"Chamado #{d.chamado_id}",
            "weight": "Bolder",
            "size": "Medium",
        },
        {"type": "TextBlock", "text": d.titulo, "wrap": True, "isSubtle": True, "spacing": "None"},
        {"type": "TextBlock", "text": aviso.texto, "wrap": True, "spacing": "Medium"},
    ]
    if aviso.detalhe:
        corpo.append({"type": "TextBlock", "text": aviso.detalhe, "wrap": True, "isSubtle": True})
    return {
        "type": "message",
        "summary": aviso.texto,
        "attachments": [
            {
                "contentType": "application/vnd.microsoft.card.adaptive",
                "content": {
                    "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                    "type": "AdaptiveCard",
                    "version": "1.4",
                    "body": corpo,
                    "actions": [{"type": "Action.OpenUrl", "title": aviso.botao, "url": link}],
                },
            }
        ],
    }


def resposta_automatica(
    texto_inicial: str, central: str, ultimo_chamado: int | None
) -> dict[str, Any]:
    """Quando alguém escreve para o bot: nada vai para o chamado; o bot aponta para a Central."""
    corpo: list[dict[str, Any]] = [{"type": "TextBlock", "text": texto_inicial, "wrap": True}]
    acoes: list[dict[str, Any]] = []
    if ultimo_chamado is not None:
        corpo.append(
            {
                "type": "TextBlock",
                "text": f"Para falar sobre o chamado #{ultimo_chamado}, responda pelo próprio chamado.",
                "wrap": True,
            }
        )
        acoes.append(
            {
                "type": "Action.OpenUrl",
                "title": f"Abrir chamado #{ultimo_chamado}",
                "url": f"{central}/chamados/{ultimo_chamado}",
            }
        )
    corpo.append({"type": "TextBlock", "text": "Para um pedido novo, use a Central.", "wrap": True})
    acoes.append({"type": "Action.OpenUrl", "title": "Abrir a Central", "url": central})
    return {
        "type": "message",
        "summary": texto_inicial,
        "attachments": [
            {
                "contentType": "application/vnd.microsoft.card.adaptive",
                "content": {
                    "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                    "type": "AdaptiveCard",
                    "version": "1.4",
                    "body": corpo,
                    "actions": acoes,
                },
            }
        ],
    }
