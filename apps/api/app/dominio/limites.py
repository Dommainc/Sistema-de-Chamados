"""Limites de caracteres (dono, 2026-10-23). Espelho: apps/web/lib/dominio/limites.ts."""

#: "Resumo do problema" (vira chamados.titulo).
TITULO_MAX = 100
#: Campos de texto longo do formulário (ex.: "Descreva o que está acontecendo").
TEXTO_LONGO_MAX = 2000
#: Cada mensagem do chat.
MENSAGEM_MAX = 2000
#: Motivo de cancelar, transferir ou mudar o prazo.
MOTIVO_MAX = 500


def numero_br(n: int) -> str:
    """2000 → '2.000' (como aparece na mensagem de erro)."""
    return f"{n:,}".replace(",", ".")
