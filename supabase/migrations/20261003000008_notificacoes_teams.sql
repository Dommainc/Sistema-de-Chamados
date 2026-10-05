-- =============================================================================
-- 0008 — Notificações (outbox), conversas do Teams e log da resposta automática
-- A ação principal grava a notificação como 'pendente' na mesma transação.
-- O envio ao bot acontece depois (webhook + reprocessamento), então uma falha
-- no Teams nunca desfaz a ação (docs/adr/0003).
-- =============================================================================

create table public.notificacoes (
  id                   bigint generated always as identity primary key,
  chamado_id           bigint not null references public.chamados (id),
  destinatario_id      uuid not null references public.profiles (id),
  canal                public.canal_notificacao not null default 'teams',
  tipo                 text not null check (tipo ~ '^[a-z][a-z_]{2,49}$'),
  payload              jsonb not null default '{}'::jsonb,
  status               public.status_notificacao not null default 'pendente',
  tentativas           smallint not null default 0 check (tentativas >= 0),
  proxima_tentativa_em timestamptz not null default now(),
  enviado_em           timestamptz,
  erro                 text,
  criado_em            timestamptz not null default now()
);
comment on column public.notificacoes.tipo is
  'Ex.: chamado_aberto, chamado_assumido, chamado_transferido, nova_mensagem, status_alterado, prazo_proximo.';

-- Referência de conversa do bot para mensagens proativas.
create table public.teams_conversas (
  profile_id                uuid primary key references public.profiles (id) on delete cascade,
  teams_user_id             text not null,
  tenant_id                 text,
  conversation_id           text not null,
  service_url               text not null,
  ultimo_chamado_notificado bigint references public.chamados (id),
  atualizado_em             timestamptz not null default now()
);
comment on column public.teams_conversas.ultimo_chamado_notificado is
  'Usado pela resposta automática do bot para apontar o chamado certo.';

create trigger teams_conversas_atualizado_em
  before update on public.teams_conversas
  for each row execute function app.definir_atualizado_em();

-- Quem respondeu ao bot (para medir a frequência).
create table public.bot_respostas_automaticas (
  id                   bigint generated always as identity primary key,
  profile_id           uuid references public.profiles (id) on delete set null,
  teams_user_id        text,
  texto_recebido       text check (texto_recebido is null or length(texto_recebido) <= 4000),
  chamado_referenciado bigint references public.chamados (id),
  criado_em            timestamptz not null default now()
);
