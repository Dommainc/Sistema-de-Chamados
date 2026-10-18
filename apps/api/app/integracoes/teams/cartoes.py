"""Texto e Adaptive Card de cada aviso (docs/fases/1E-teams.md). Funções puras: fáceis de testar e de mudar.

O texto depende do tipo do aviso e de quem recebe (solicitante ou TI). Linguagem simples, sem termos técnicos.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
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
    #: Quando o chamado foi aberto e quando a TI volta ao expediente (aviso "A equipe volta amanhã às 8h").
    criado_em: datetime | None = None
    volta: datetime | None = None


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


DIAS = (
    "segunda-feira",
    "terça-feira",
    "quarta-feira",
    "quinta-feira",
    "sexta-feira",
    "sábado",
    "domingo",
)


def quando_volta(aberto: datetime, volta: datetime) -> str:
    """'hoje às 8h' · 'amanhã às 8h' · 'segunda-feira às 8h' (horário de Brasília)."""
    a, v = aberto.astimezone(FUSO), volta.astimezone(FUSO)
    dias = (v.date() - a.date()).days
    if dias == 0:
        dia = "hoje"
    elif dias == 1:
        dia = "amanhã"
    elif dias < 7:
        dia = DIAS[v.weekday()]
    else:
        dia = f"em {v:%d/%m}"
    hora = f"{v.hour}h" if v.minute == 0 else f"{v.hour}h{v.minute:02d}"
    return f"{dia} às {hora}"


def _fora_do_expediente(d: DadosAviso) -> str | None:
    if d.criado_em is None or d.volta is None or d.volta - d.criado_em < timedelta(minutes=1):
        return None
    return (
        "No momento não há técnicos em horário de atendimento. "
        f"A equipe volta {quando_volta(d.criado_em, d.volta)}."
    )


def montar_aviso(d: DadosAviso) -> Aviso:
    n = f"#{d.chamado_id}"
    tecnico = d.responsavel_nome or "A TI"
    para = d.payload.get("para")

    if d.tipo == "chamado_aberto":
        if d.para_solicitante:
            fora = _fora_do_expediente(d)
            if fora:
                return Aviso(f"Recebemos seu chamado {n}.", detalhe=fora)
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
        if para == "concluido" and d.payload.get("motivo") == "sem_resposta_48h_uteis":
            return Aviso(
                f"O chamado {n} ficou sem resposta por 48 horas e foi concluído automaticamente.",
                detalhe="Se ainda precisar de ajuda, abra um novo chamado.",
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

    if d.tipo == "lembrete_resposta":
        return Aviso(
            f"O chamado {n} está esperando sua resposta há 12 horas.",
            detalhe="Responda no chat do chamado para continuarmos o atendimento.",
            botao="Responder",
        )

    if d.tipo == "aviso_inatividade":
        return Aviso(
            f"O chamado {n} está esperando sua resposta há 24 horas.",
            detalhe="Sem resposta em 48 horas úteis, o chamado será concluído automaticamente.",
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


# ------------------------------------------------------------------ resumo mensal (migration 0032)
MESES = (
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
)


def _nome_mes(ano_mes: str) -> str:
    """'2026-10' → 'outubro de 2026'."""
    ano, mes = ano_mes.split("-")
    return f"{MESES[int(mes) - 1]} de {ano}"


def _mes_anterior(ano_mes: str) -> str:
    ano, mes = (int(x) for x in ano_mes.split("-"))
    return f"{ano - 1}-12" if mes == 1 else f"{ano}-{mes - 1:02d}"


def _horas(valor: object) -> str:
    """Horas úteis como no Dashboard: 1,5 → '1 h 30 min'; 0,4 → '24 min'; vazio → '—'."""
    if valor is None:
        return "—"
    minutos = round(float(str(valor)) * 60)
    h, m = divmod(minutos, 60)
    if h == 0:
        return f"{m} min"
    return f"{h} h" + (f" {m} min" if m else "")


def _porcento(dentro: object, total: object) -> str:
    d, t = int(str(dentro or 0)), int(str(total or 0))
    return f"{round(d * 100 / t)}% ({d} de {t})" if t else "—"


def _nota(media: object, quantidade: object) -> str:
    if media is None:
        return "—"
    return f"{float(str(media)):.1f}".replace(".", ",") + f" ({int(str(quantidade or 0))})"


def linhas_resumo(n: dict[str, Any]) -> list[tuple[str, str]]:
    """Indicador → valor, na ordem do cartão."""
    return [
        ("Chamados abertos", str(n.get("abertos", 0))),
        ("Concluídos", str(n.get("concluidos", 0))),
        ("Cancelados", str(n.get("cancelados", 0))),
        ("Em aberto no fim do mês", str(n.get("em_aberto_no_fim", 0))),
        ("Tempo médio até iniciar", _horas(n.get("horas_ate_iniciar"))),
        ("Tempo médio até concluir", _horas(n.get("horas_ate_concluir"))),
        ("Concluídos no prazo", _porcento(n.get("no_prazo"), n.get("com_prazo"))),
        ("Satisfação média (avaliações)", _nota(n.get("nota_media"), n.get("avaliacoes"))),
    ]


def cartao_resumo(payload: dict[str, Any], central: str) -> dict[str, Any]:
    """Cartão do resumo mensal: tabela Indicador | mês | mês anterior, e o botão para o Dashboard."""
    mes = str(payload.get("mes", ""))
    atual = linhas_resumo(payload.get("atual") or {})
    anterior = dict(linhas_resumo(payload.get("anterior") or {}))
    nome_atual = _nome_mes(mes) if mes else ""
    nome_anterior = _nome_mes(_mes_anterior(mes)).split(" de ")[0] if mes else ""

    def linha(textos: list[str], negrito: bool = False) -> dict[str, Any]:
        return {
            "type": "ColumnSet",
            "spacing": "Small",
            "columns": [
                {
                    "type": "Column",
                    "width": largura,
                    "items": [
                        {
                            "type": "TextBlock",
                            "text": t,
                            "wrap": True,
                            "weight": "Bolder" if negrito else "Default",
                            "horizontalAlignment": "Left" if i == 0 else "Right",
                        }
                    ],
                }
                for i, (t, largura) in enumerate(
                    zip(textos, ("stretch", "auto", "auto"), strict=True)
                )
            ],
        }

    corpo: list[dict[str, Any]] = [
        {
            "type": "TextBlock",
            "text": f"Resumo da TI · {nome_atual}",
            "weight": "Bolder",
            "size": "Medium",
            "wrap": True,
        },
        {
            "type": "TextBlock",
            "text": "Tempos em horas úteis (seg–sex, no expediente).",
            "isSubtle": True,
            "spacing": "None",
            "wrap": True,
        },
        linha(
            ["", nome_atual.split(" de ")[0].capitalize(), nome_anterior.capitalize()], negrito=True
        ),
        *[linha([rotulo, valor, anterior.get(rotulo, "—")]) for rotulo, valor in atual],
    ]
    resumo = (
        f"Resumo da TI de {nome_atual}: {atual[0][1]} chamados abertos, {atual[1][1]} concluídos."
    )
    return {
        "type": "message",
        "summary": resumo,
        "attachments": [
            {
                "contentType": "application/vnd.microsoft.card.adaptive",
                "content": {
                    "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                    "type": "AdaptiveCard",
                    "version": "1.4",
                    "body": corpo,
                    "actions": [
                        {
                            "type": "Action.OpenUrl",
                            "title": "Abrir o Dashboard do mês",
                            "url": f"{central}/atendimento/dashboard?periodo=mes_passado",
                        }
                    ],
                },
            }
        ],
    }
