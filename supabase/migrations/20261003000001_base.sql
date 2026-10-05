-- =============================================================================
-- 0001 — Base: extensões, schema interno, papel de escrita da API e enums
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;

-- Schema interno. NÃO deve ser adicionado aos "exposed schemas" da API REST
-- (supabase/config.toml -> [api].schemas). Guarda funções de regra e de RLS.
create schema if not exists app;
comment on schema app is
  'Funções internas da Central de Chamados. Não exposto pela API REST.';

-- -----------------------------------------------------------------------------
-- Papel usado SOMENTE pela FastAPI para gravar (ver docs/adr/0002).
-- Criado sem login; a senha é definida manualmente por ambiente:
--   alter role central_api with login password '<segredo>';
-- (procedimento em docs/runbooks/rotacionar-chave.md)
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'central_api') then
    create role central_api nologin noinherit;
  end if;
end
$$;
comment on role central_api is
  'Escrita da FastAPI. Lê como o usuário via SET LOCAL ROLE authenticated; grava com este papel.';

-- Permite à FastAPI fazer "set local role authenticated" para ler sob RLS.
grant authenticated to central_api;

grant usage on schema public to central_api;
grant usage on schema app to authenticated, central_api;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.papel as enum ('solicitante', 'ti');

create type public.status_chamado as enum (
  'aberto',
  'em_analise',
  'em_atendimento',
  'aguardando_usuario',
  'transferido',
  'resolvido',
  'fechado',
  'cancelado'
);

create type public.prioridade as enum ('baixa', 'media', 'alta', 'critica');

create type public.origem_mensagem as enum ('web', 'teams');

create type public.origem_anexo as enum ('upload', 'colado');

create type public.tipo_campo as enum (
  'texto',
  'texto_longo',
  'numero',
  'data',
  'selecao',
  'multipla_selecao',
  'sim_nao'
);

create type public.canal_notificacao as enum ('teams');

create type public.status_notificacao as enum ('pendente', 'enviada', 'falhou');

-- -----------------------------------------------------------------------------
-- Utilitário: mantém atualizado_em
-- -----------------------------------------------------------------------------
create or replace function app.definir_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;
