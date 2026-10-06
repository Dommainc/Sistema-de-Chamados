"""Configuração lida do ambiente (.env local; variáveis da Vercel em dev/prod). Ver .env.example."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    #: dev = mostra `detalhe` nos erros e não muda o papel no login; prod = nunca.
    ambiente: Literal["dev", "prod", "teste"] = "dev"

    #: Conexão como o papel central_api (porta 6543 = Supavisor em modo transaction).
    database_url: SecretStr | None = None

    #: URL do projeto Supabase (para buscar as chaves públicas do login — JWKS).
    supabase_url: str | None = None
    #: Segredo do JWT (projetos antigos / ambiente local que assinam com HS256). Opcional.
    supabase_jwt_secret: SecretStr | None = None
    jwt_audience: str = "authenticated"

    #: Id do grupo "Central-Chamados-TI" no Entra ID (docs/adr/0004).
    entra_grupo_ti_id: str | None = None

    #: Origem do front, liberada no CORS.
    web_origem: str = "http://localhost:3000"


@lru_cache
def obter_settings() -> Settings:
    return Settings()
