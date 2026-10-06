"""Papel a partir do grupo do Entra ID (docs/adr/0004 e 0007).

O provider Azure do Supabase pode entregar os grupos em lugares diferentes; procuramos, nesta ordem:
`groups` (claim de topo), `user_metadata.custom_claims.groups`, `user_metadata.groups`.
PROVISÓRIO até o App Registration existir: confirmar onde o claim chega e ajustar (pendencias.md).
"""

from __future__ import annotations

from typing import Any

from app.dominio.tipos import Papel


def extrair_grupos(claims: dict[str, Any]) -> list[str] | None:
    """Lista de ids de grupos do token, ou None se o claim não veio."""
    metadados = claims.get("user_metadata") or {}
    candidatos = (
        claims.get("groups"),
        (metadados.get("custom_claims") or {}).get("groups"),
        metadados.get("groups"),
    )
    for grupos in candidatos:
        if isinstance(grupos, list):
            return [str(g) for g in grupos]
    return None


def papel_pelos_grupos(claims: dict[str, Any], grupo_ti_id: str | None) -> Papel | None:
    """'ti' se o usuário está no grupo Central-Chamados-TI; 'solicitante' se não está;
    None se o token não trouxe grupos (quem chama decide: menor privilégio + log)."""
    grupos = extrair_grupos(claims)
    if grupos is None:
        return None
    return "ti" if grupo_ti_id and grupo_ti_id in grupos else "solicitante"
