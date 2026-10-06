"""Autenticação: valida o JWT do Supabase Auth (docs/adr/0007).

1. Chaves assimétricas (RS256/ES256) pelas chaves públicas do projeto (JWKS),
   o modelo atual do Supabase.
2. HS256 com SUPABASE_JWT_SECRET — projetos antigos e ambiente local.
Token ausente, inválido ou expirado → SESSAO_EXPIRADA (401), sempre com a mesma mensagem.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from functools import lru_cache
from typing import Annotated, Any

import jwt
from fastapi import Depends, Header

from app.config import Settings, obter_settings
from app.erros.catalogo import ErroApp

BuscarChave = Callable[[str], Any]


@dataclass(frozen=True)
class UsuarioAutenticado:
    id: str
    email: str | None
    #: Claims do JWT — repassadas ao Postgres para o RLS (request.jwt.claims).
    claims: dict[str, Any]


class VerificadorJwt:
    def __init__(
        self,
        *,
        audience: str,
        segredo: str | None = None,
        buscar_chave: BuscarChave | None = None,
    ) -> None:
        self._audience = audience
        self._segredo = segredo
        self._buscar_chave = buscar_chave

    def verificar(self, token: str) -> dict[str, Any]:
        opcoes = {"require": ["exp", "sub"]}
        try:
            alg = jwt.get_unverified_header(token).get("alg")
            if alg == "HS256" and self._segredo:
                return jwt.decode(
                    token,
                    self._segredo,
                    algorithms=["HS256"],
                    audience=self._audience,
                    options=opcoes,
                )
            if alg in ("RS256", "ES256") and self._buscar_chave:
                chave = self._buscar_chave(token)
                return jwt.decode(
                    token, chave, algorithms=[alg], audience=self._audience, options=opcoes
                )
        except jwt.ExpiredSignatureError as erro:
            raise ErroApp("SESSAO_EXPIRADA", detalhe="token expirado") from erro
        except (jwt.InvalidTokenError, jwt.PyJWKClientError) as erro:
            raise ErroApp("SESSAO_EXPIRADA", detalhe=f"token inválido: {erro}") from erro
        raise ErroApp("SESSAO_EXPIRADA", detalhe=f"algoritmo não aceito: {alg}")


def criar_verificador(settings: Settings) -> VerificadorJwt:
    buscar_chave: BuscarChave | None = None
    if settings.supabase_url:
        cliente = jwt.PyJWKClient(
            f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json",
            cache_keys=True,
            lifespan=3600,
        )

        def buscar_chave(token: str) -> Any:
            return cliente.get_signing_key_from_jwt(token).key

    segredo = (
        settings.supabase_jwt_secret.get_secret_value() if settings.supabase_jwt_secret else None
    )
    return VerificadorJwt(
        audience=settings.jwt_audience, segredo=segredo, buscar_chave=buscar_chave
    )


@lru_cache
def obter_verificador() -> VerificadorJwt:
    return criar_verificador(obter_settings())


# Função síncrona de propósito: o FastAPI a roda numa thread, então buscar as chaves (rede)
# não trava a API.
def usuario_atual(
    verificador: Annotated[VerificadorJwt, Depends(obter_verificador)],
    authorization: Annotated[str | None, Header()] = None,
) -> UsuarioAutenticado:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise ErroApp("SESSAO_EXPIRADA", detalhe="cabeçalho Authorization ausente")
    claims = verificador.verificar(authorization.split(" ", 1)[1].strip())
    return UsuarioAutenticado(id=str(claims["sub"]), email=claims.get("email"), claims=claims)


UsuarioAtual = Annotated[UsuarioAutenticado, Depends(usuario_atual)]
