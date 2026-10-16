"""Configuração lida do ambiente (.env local; variáveis da Vercel em dev/prod). Ver .env.example."""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Literal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # CENTRAL_ENV_FILE vazio = não lê arquivo (os testes usam isso para nunca tocar o banco do .env local).
    model_config = SettingsConfigDict(
        env_file=os.environ.get("CENTRAL_ENV_FILE", ".env") or None,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    #: dev = mostra `detalhe` nos erros e não muda o papel no login; prod = nunca.
    ambiente: Literal["dev", "prod", "teste"] = "dev"

    #: Conexão como o papel central_api (porta 6543 = Supavisor em modo transaction).
    database_url: SecretStr | None = None

    #: URL do projeto Supabase (para buscar as chaves públicas do login — JWKS).
    supabase_url: str | None = None
    #: Chave service_role — SÓ na API, só para o Storage (URLs assinadas) e jobs. Nunca no front.
    supabase_service_role_key: SecretStr | None = None
    #: Segredo do JWT (projetos antigos / ambiente local que assinam com HS256). Opcional.
    supabase_jwt_secret: SecretStr | None = None
    jwt_audience: str = "authenticated"

    #: Id do grupo "Central-Chamados-TI" no Entra ID (docs/adr/0004).
    entra_grupo_ti_id: str | None = None

    #: Origem do front, liberada no CORS. Também é o endereço dos links nos avisos do Teams.
    web_origem: str = "http://localhost:3000"

    #: Bot do Teams (docs/adr/0018). Sem os três, o envio fica desligado e os avisos esperam como pendente.
    bot_app_id: str | None = None
    bot_app_segredo: SecretStr | None = None
    bot_tenant_id: str | None = None
    #: Registro do bot "Várias organizações" (criado pelo Portal do Desenvolvedor do Teams): o token é pedido
    #: ao diretório do Bot Framework (botframework.com), não ao da DOMMA. BOT_TENANT_ID continua sendo o da
    #: DOMMA: só pessoas da DOMMA falam com o bot.
    bot_multilocatario: bool = False
    #: Segredo que o banco (pg_cron + pg_net) manda em X-Central-Secret para disparar o envio dos avisos.
    processador_segredo: SecretStr | None = None


@lru_cache
def obter_settings() -> Settings:
    return Settings()
