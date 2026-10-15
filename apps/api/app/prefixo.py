"""Prefixo `/api` da Vercel Services (ADR 0017).

No projeto único da Vercel o site fica em `/` e a API em `/api`; a rota chega à API com o prefixo
(`/api/chamados/42`). Este middleware tira o `/api` do caminho, então as rotas continuam as mesmas
(`/chamados/42`) — local, nos testes e na Vercel. Chamada sem o prefixo (local, CI) passa direto.
"""

from __future__ import annotations

from starlette.types import ASGIApp, Receive, Scope, Send

PREFIXO = "/api"


class PrefixoApi:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] in ("http", "websocket"):
            caminho: str = scope.get("path", "")
            if caminho == PREFIXO or caminho.startswith(PREFIXO + "/"):
                scope = dict(scope)
                scope["path"] = caminho[len(PREFIXO) :] or "/"
                raw = scope.get("raw_path")
                if isinstance(raw, bytes) and raw.startswith(PREFIXO.encode()):
                    scope["raw_path"] = raw[len(PREFIXO) :] or b"/"
                scope["root_path"] = scope.get("root_path", "") + PREFIXO
        await self.app(scope, receive, send)
