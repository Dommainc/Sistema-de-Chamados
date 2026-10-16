"""Confere que uma mensagem recebida em /bot/mensagens veio mesmo do Teams (Bot Framework).

O Teams assina cada chamada com um JWT: emissor do Bot Framework (ou do Entra da DOMMA, em bots
single-tenant), público = o App ID do bot. Também confere o serviceUrl do token com o da mensagem.
Qualquer falha → SEM_PERMISSAO (a rota responde 403 sem detalhes).
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import jwt

from app.erros.catalogo import ErroApp

EMISSOR_BOT_FRAMEWORK = "https://api.botframework.com"
JWKS_BOT_FRAMEWORK = "https://login.botframework.com/v1/.well-known/keys"

BuscarChave = Callable[[str], Any]


def emissores_entra(tenant_id: str) -> tuple[str, str]:
    return (
        f"https://login.microsoftonline.com/{tenant_id}/v2.0",
        f"https://sts.windows.net/{tenant_id}/",
    )


class VerificadorTeams:
    def __init__(
        self,
        app_id: str,
        tenant_id: str,
        *,
        chave_bot_framework: BuscarChave | None = None,
        chave_entra: BuscarChave | None = None,
    ) -> None:
        self._app_id = app_id
        self._entra = emissores_entra(tenant_id)
        if chave_bot_framework is None:
            cliente_bf = jwt.PyJWKClient(JWKS_BOT_FRAMEWORK, cache_keys=True, lifespan=86400)
            chave_bot_framework = lambda t: cliente_bf.get_signing_key_from_jwt(t).key  # noqa: E731
        if chave_entra is None:
            cliente_entra = jwt.PyJWKClient(
                f"https://login.microsoftonline.com/{tenant_id}/discovery/v2.0/keys",
                cache_keys=True,
                lifespan=86400,
            )
            chave_entra = lambda t: cliente_entra.get_signing_key_from_jwt(t).key  # noqa: E731
        self._chave_bf = chave_bot_framework
        self._chave_entra = chave_entra

    def verificar(self, autorizacao: str | None, service_url: str | None) -> dict[str, Any]:
        if not autorizacao or not autorizacao.startswith("Bearer "):
            raise ErroApp("SEM_PERMISSAO", detalhe="bot: sem token")
        token = autorizacao.removeprefix("Bearer ").strip()
        try:
            emissor = jwt.decode(token, options={"verify_signature": False}).get("iss")
            if emissor == EMISSOR_BOT_FRAMEWORK:
                chave = self._chave_bf(token)
            elif emissor in self._entra:
                chave = self._chave_entra(token)
            else:
                raise ErroApp("SEM_PERMISSAO", detalhe=f"bot: emissor não aceito {emissor}")
            claims: dict[str, Any] = jwt.decode(
                token,
                chave,
                algorithms=["RS256"],
                audience=self._app_id,
                issuer=emissor,
                leeway=300,
                options={"require": ["exp", "iss", "aud"]},
            )
        except (jwt.InvalidTokenError, jwt.PyJWKClientError) as erro:
            raise ErroApp("SEM_PERMISSAO", detalhe=f"bot: token inválido ({erro})") from erro

        url_token = claims.get("serviceurl") or claims.get("serviceUrl")
        if url_token and service_url and url_token.rstrip("/") != service_url.rstrip("/"):
            raise ErroApp("SEM_PERMISSAO", detalhe="bot: serviceUrl diferente do token")
        return claims
