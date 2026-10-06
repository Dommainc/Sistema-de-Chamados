"""Tipos do domínio (espelham supabase/migrations e apps/web/lib/dominio/tipos.ts)."""

from __future__ import annotations

from typing import Literal

Papel = Literal["solicitante", "ti"]

StatusChamado = Literal[
    "pendente",
    "em_andamento",
    "aguardando_usuario",
    "transferido",
    "concluido",
    "cancelado",
]

STATUS: tuple[StatusChamado, ...] = (
    "pendente",
    "em_andamento",
    "aguardando_usuario",
    "transferido",
    "concluido",
    "cancelado",
)

STATUS_ENCERRADOS: frozenset[StatusChamado] = frozenset({"concluido", "cancelado"})

#: Rótulos por perfil (docs/status.md). O solicitante não vê que o chamado foi transferido.
ROTULOS: dict[Papel, dict[StatusChamado, str]] = {
    "solicitante": {
        "pendente": "Recebido",
        "em_andamento": "Em atendimento",
        "aguardando_usuario": "Aguardando sua resposta",
        "transferido": "Em atendimento",
        "concluido": "Concluído",
        "cancelado": "Cancelado",
    },
    "ti": {
        "pendente": "Novo",
        "em_andamento": "Em atendimento",
        "aguardando_usuario": "Aguardando usuário",
        "transferido": "Transferido",
        "concluido": "Concluído",
        "cancelado": "Cancelado",
    },
}


def esta_encerrado(status: StatusChamado) -> bool:
    return status in STATUS_ENCERRADOS
