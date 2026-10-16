"""Envio de mensagens ao Teams pela API REST do Bot Framework (sem SDK — docs/adr/0018).

- Token: client credentials do App Registration do bot (single-tenant), escopo do Bot Framework.
- Envio: POST {serviceUrl}/v3/conversations/{id}/activities.
- E-mail de quem fala com o bot: GET {serviceUrl}/v3/conversations/{id}/members/{userId} (é a própria API do
  Bot Framework, não o Graph).
Timeout de 5 s por chamada: Teams lento ou fora do ar nunca segura a Central (falha vira nova tentativa).
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any, Protocol
from urllib.parse import quote

import httpx

ESCOPO = "https://api.botframework.com/.default"
TIMEOUT = 5.0


class ErroTeams(Exception):
    """Falha ao falar com o Teams (rede, token, 4xx/5xx). A mensagem vai para notificacoes.erro."""


@dataclass(frozen=True)
class Membro:
    email: str | None
    upn: str | None
    aad_object_id: str | None
    nome: str | None


class Conector(Protocol):
    async def enviar(
        self, service_url: str, conversa_id: str, atividade: dict[str, Any]
    ) -> None: ...

    async def membro(
        self, service_url: str, conversa_id: str, usuario_id: str
    ) -> Membro | None: ...


class ConectorTeams:
    def __init__(
        self,
        app_id: str,
        segredo: str,
        tenant_id: str,
        *,
        transporte: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._app_id = app_id
        self._segredo = segredo
        self._url_token = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
        self._transporte = transporte
        self._token: str | None = None
        self._expira = 0.0

    def _cliente(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(timeout=TIMEOUT, transport=self._transporte)

    async def _obter_token(self, cliente: httpx.AsyncClient) -> str:
        if self._token and time.monotonic() < self._expira:
            return self._token
        try:
            resposta = await cliente.post(
                self._url_token,
                data={
                    "grant_type": "client_credentials",
                    "client_id": self._app_id,
                    "client_secret": self._segredo,
                    "scope": ESCOPO,
                },
            )
        except httpx.HTTPError as erro:
            raise ErroTeams(f"token: {type(erro).__name__}") from erro
        if resposta.status_code != 200:
            # Nunca guardar o corpo inteiro: pode ecoar dados da requisição.
            raise ErroTeams(f"token: HTTP {resposta.status_code}")
        dados = resposta.json()
        self._token = str(dados["access_token"])
        self._expira = time.monotonic() + int(dados.get("expires_in", 3600)) - 300
        return self._token

    async def _pedir(self, metodo: str, url: str, **kwargs: Any) -> httpx.Response:
        async with self._cliente() as cliente:
            token = await self._obter_token(cliente)
            try:
                resposta = await cliente.request(
                    metodo, url, headers={"Authorization": f"Bearer {token}"}, **kwargs
                )
            except httpx.HTTPError as erro:
                raise ErroTeams(f"Teams: {type(erro).__name__}") from erro
        if resposta.status_code == 401:
            self._token = None  # próxima tentativa pede um token novo
        return resposta

    async def enviar(self, service_url: str, conversa_id: str, atividade: dict[str, Any]) -> None:
        url = f"{service_url.rstrip('/')}/v3/conversations/{quote(conversa_id, safe='')}/activities"
        resposta = await self._pedir("POST", url, json=atividade)
        if resposta.status_code >= 300:
            raise ErroTeams(f"Teams: HTTP {resposta.status_code}")

    async def membro(self, service_url: str, conversa_id: str, usuario_id: str) -> Membro | None:
        url = (
            f"{service_url.rstrip('/')}/v3/conversations/{quote(conversa_id, safe='')}"
            f"/members/{quote(usuario_id, safe='')}"
        )
        resposta = await self._pedir("GET", url)
        if resposta.status_code >= 300:
            return None
        dados = resposta.json()

        def minusculo(chave: str) -> str | None:
            valor = dados.get(chave)
            return valor.strip().lower() if isinstance(valor, str) and valor.strip() else None

        return Membro(
            email=minusculo("email"),
            upn=minusculo("userPrincipalName"),
            aad_object_id=dados.get("aadObjectId") or dados.get("objectId"),
            nome=dados.get("name"),
        )
