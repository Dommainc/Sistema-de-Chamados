"""Storage dos anexos (bucket privado "anexos", migration 0011). A service_role fica SÓ aqui, na API.

Fluxo (CLAUDE.md, "Anexos"): a API valida e devolve uma URL assinada de upload para
temporarios/{usuario}/...; o navegador envia direto ao Storage; ao criar o chamado/mensagem a API confere
o arquivo e o move para chamados/{id}/....
ATENÇÃO: a versão Supabase foi escrita antes de existir projeto — validar no dev (pendencias.md P-034).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol

import httpx

from app.erros.catalogo import ErroApp

BUCKET = "anexos"


@dataclass(frozen=True)
class InfoArquivo:
    tamanho: int
    mime: str


class Armazenamento(Protocol):
    async def criar_url_upload(self, caminho: str) -> str: ...

    async def informacoes(self, caminho: str) -> InfoArquivo | None:
        """Tamanho e tipo REAIS do arquivo enviado (None = não existe)."""
        ...

    async def mover(self, de: str, para: str) -> None: ...

    async def criar_url_download(self, caminho: str, segundos: int = 60) -> str: ...


class ArmazenamentoSupabase:
    def __init__(self, url: str, service_role: str) -> None:
        self._base = f"{url.rstrip('/')}/storage/v1"
        self._cabecalhos = {"Authorization": f"Bearer {service_role}", "apikey": service_role}

    async def _pedir(self, metodo: str, caminho: str, **kwargs: object) -> httpx.Response:
        try:
            async with httpx.AsyncClient(timeout=10) as cliente:
                resposta = await cliente.request(
                    metodo, f"{self._base}{caminho}", headers=self._cabecalhos, **kwargs
                )
        except httpx.HTTPError as erro:
            raise ErroApp("UPLOAD_FALHOU", detalhe=f"Storage indisponível: {erro}") from erro
        return resposta

    async def criar_url_upload(self, caminho: str) -> str:
        resposta = await self._pedir("POST", f"/object/upload/sign/{BUCKET}/{caminho}")
        if resposta.status_code >= 400:
            raise ErroApp("UPLOAD_FALHOU", detalhe=f"upload/sign {resposta.status_code}")
        return f"{self._base}{resposta.json()['url']}"

    async def informacoes(self, caminho: str) -> InfoArquivo | None:
        resposta = await self._pedir("HEAD", f"/object/{BUCKET}/{caminho}")
        if resposta.status_code == 404 or resposta.status_code == 400:
            return None
        if resposta.status_code >= 400:
            raise ErroApp("UPLOAD_FALHOU", detalhe=f"HEAD {resposta.status_code}")
        return InfoArquivo(
            tamanho=int(resposta.headers.get("content-length", "0")),
            mime=resposta.headers.get("content-type", "").split(";")[0].strip(),
        )

    async def mover(self, de: str, para: str) -> None:
        resposta = await self._pedir(
            "POST",
            "/object/move",
            json={"bucketId": BUCKET, "sourceKey": de, "destinationKey": para},
        )
        if resposta.status_code >= 400:
            raise ErroApp("UPLOAD_FALHOU", detalhe=f"move {resposta.status_code}")

    async def criar_url_download(self, caminho: str, segundos: int = 60) -> str:
        resposta = await self._pedir(
            "POST", f"/object/sign/{BUCKET}/{caminho}", json={"expiresIn": segundos}
        )
        if resposta.status_code >= 400:
            raise ErroApp("UPLOAD_FALHOU", detalhe=f"sign {resposta.status_code}")
        return f"{self._base}{resposta.json()['signedURL']}"


@dataclass
class ArmazenamentoMemoria:
    """Storage dos testes: `arquivos` = caminho → (tamanho, mime)."""

    arquivos: dict[str, InfoArquivo] = field(default_factory=dict)
    falhar: bool = False

    async def criar_url_upload(self, caminho: str) -> str:
        return f"https://storage.teste/upload/{caminho}?token=x"

    async def informacoes(self, caminho: str) -> InfoArquivo | None:
        if self.falhar:
            raise ErroApp("UPLOAD_FALHOU", detalhe="falha simulada")
        return self.arquivos.get(caminho)

    async def mover(self, de: str, para: str) -> None:
        self.arquivos[para] = self.arquivos.pop(de)

    async def criar_url_download(self, caminho: str, segundos: int = 60) -> str:
        return f"https://storage.teste/download/{caminho}?expira={segundos}"
