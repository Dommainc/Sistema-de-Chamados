"""Regras de anexos (docs/escopo.md 7.3). Espelho de apps/web/lib/anexos.ts — validar no front E no back."""

from __future__ import annotations

import re
import unicodedata
import uuid

from app.erros.catalogo import ErroApp

TAMANHO_MAX_MB = 10
TAMANHO_MAX_BYTES = TAMANHO_MAX_MB * 1024 * 1024

TIPOS_PERMITIDOS: frozenset[str] = frozenset(
    {
        "image/png",
        "image/jpeg",
        "image/gif",
        "image/webp",
        "image/heic",
        "application/pdf",
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    }
)

PASTA_TEMPORARIOS = "temporarios"


def validar_arquivo(tamanho: int, mime: str) -> None:
    """Lança ANEXO_TIPO_INVALIDO ou ANEXO_MUITO_GRANDE (mesmas mensagens do front)."""
    if mime not in TIPOS_PERMITIDOS:
        raise ErroApp("ANEXO_TIPO_INVALIDO", detalhe=f"tipo {mime!r}")
    if tamanho <= 0 or tamanho > TAMANHO_MAX_BYTES:
        raise ErroApp("ANEXO_MUITO_GRANDE", detalhe=f"{tamanho} bytes")


def nome_seguro(nome: str) -> str:
    """Nome de arquivo sem barras, acentos estranhos ou caracteres que quebrem o caminho no Storage."""
    base = unicodedata.normalize("NFKD", nome).encode("ascii", "ignore").decode()
    base = re.sub(r"[^A-Za-z0-9._-]+", "-", base).strip(".-")
    return (base or "arquivo")[:120]


def caminho_temporario(usuario_id: str, nome: str) -> str:
    """temporarios/{usuario_id}/{uuid}-{nome} — o navegador envia direto ao Storage com URL assinada."""
    return f"{PASTA_TEMPORARIOS}/{usuario_id}/{uuid.uuid4().hex}-{nome_seguro(nome)}"


def caminho_definitivo(chamado_id: int, caminho_temp: str) -> str:
    """chamados/{id}/{uuid}-{nome} (a migration exige o prefixo do próprio chamado)."""
    return f"chamados/{chamado_id}/{caminho_temp.rsplit('/', 1)[-1]}"


def e_do_usuario(caminho_temp: str, usuario_id: str) -> bool:
    """O upload precisa ser do próprio usuário (ninguém anexa arquivo enviado por outra pessoa)."""
    prefixo = f"{PASTA_TEMPORARIOS}/{usuario_id}/"
    return caminho_temp.startswith(prefixo) and "/" not in caminho_temp[len(prefixo) :]
