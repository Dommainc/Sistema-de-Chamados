-- =============================================================================
-- 0027 — Bot do Teams próprio da Central (docs/adr/0018)
--
-- 1) teams_conversas passa a guardar a conversa de QUEM instalou o bot, mesmo antes do primeiro login
--    na Central: a chave vira o id do Teams e a ligação com o perfil é pelo e-mail (o Teams não manda o id
--    do Supabase). profile_id fica preenchido quando a pessoa já tem perfil.
-- 2) O envio dos avisos (outbox, ADR 0003) é disparado pelo próprio banco: pg_cron a cada minuto chama a
--    API (pg_net) em /api/internal/notificacoes/processar, só se houver aviso esperando. Endereço e segredo
--    ficam no Vault (nunca nesta migration): ver docs/runbooks/bot-teams.md.
-- =============================================================================

-- ------------------------------------------------------------------ 1) conversas do bot
alter table public.teams_conversas drop constraint teams_conversas_pkey;
alter table public.teams_conversas alter column profile_id drop not null;
alter table public.teams_conversas add constraint teams_conversas_pkey primary key (teams_user_id);
alter table public.teams_conversas add constraint teams_conversas_profile_unico unique (profile_id);
alter table public.teams_conversas
  add column email text check (email is null or email = lower(email)),
  add column upn   text check (upn is null or upn = lower(upn)),
  add column aad_object_id text;

create index teams_conversas_email_idx on public.teams_conversas (email);
create index teams_conversas_upn_idx on public.teams_conversas (upn);

comment on column public.teams_conversas.email is
  'E-mail da pessoa no Teams (minúsculo). Liga a conversa ao perfil (profiles.email), mesmo antes do 1º login.';

-- Avisos esperando, na ordem: o processador da API pega daqui (for update skip locked).
create index if not exists notificacoes_fila_idx on public.notificacoes (proxima_tentativa_em)
  where status = 'pendente';

-- ------------------------------------------------------------------ 2) disparo pelo banco
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
  end if;
end
$$;

create or replace function app.disparar_envio_teams()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url      text;
  v_segredo  text;
begin
  if not exists (
    select 1 from public.notificacoes
     where status = 'pendente' and proxima_tentativa_em <= now()
  ) then
    return false;
  end if;
  if to_regclass('vault.decrypted_secrets') is null or to_regnamespace('net') is null then
    return false;
  end if;

  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'central_api_url';
  select decrypted_secret into v_segredo
    from vault.decrypted_secrets where name = 'central_processador_segredo';
  if v_url is null or v_segredo is null then
    return false; -- bot ainda não configurado: os avisos esperam como pendente
  end if;

  perform net.http_post(
    url     := rtrim(v_url, '/') || '/internal/notificacoes/processar',
    headers := jsonb_build_object('Content-Type', 'application/json', 'X-Central-Secret', v_segredo),
    body    := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  return true;
end;
$$;

comment on function app.disparar_envio_teams() is
  'Chama a API para enviar os avisos pendentes ao Teams (pg_cron, a cada minuto). Sem Vault configurado, não faz nada.';

revoke execute on function app.disparar_envio_teams() from public;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.schedule('enviar-avisos-teams', '* * * * *', 'select app.disparar_envio_teams()');
  end if;
end
$$;
