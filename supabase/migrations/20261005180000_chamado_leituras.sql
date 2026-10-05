-- =============================================================================
-- 0017 — Leitura da conversa por usuário ("• Nova mensagem" em Meus chamados)
-- Uma linha por (chamado, usuário): até quando a conversa foi lida.
-- Leitura: cada um vê só as próprias linhas. Escrita: só a FastAPI (central_api),
-- como todas as tabelas de negócio (docs/adr/0002) — o front chama a API ao abrir o chamado.
-- =============================================================================

create table public.chamado_leituras (
  chamado_id    bigint not null references public.chamados (id),
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  lido_ate      timestamptz not null,
  atualizado_em timestamptz not null default now(),
  primary key (chamado_id, profile_id)
);
comment on table public.chamado_leituras is
  'Até quando cada usuário leu a conversa do chamado. Mensagem de outra pessoa depois de lido_ate = não lida.';

create trigger chamado_leituras_atualizado_em
  before update on public.chamado_leituras
  for each row execute function app.definir_atualizado_em();

alter table public.chamado_leituras enable row level security;

grant select on public.chamado_leituras to authenticated;
grant select, insert, update on public.chamado_leituras to central_api;

create policy chamado_leituras_proprias on public.chamado_leituras
  for select to authenticated
  using (profile_id = (select auth.uid()));

create policy api_chamado_leituras on public.chamado_leituras
  for all to central_api
  using (true) with check (true);

create index chamado_leituras_profile_idx on public.chamado_leituras (profile_id);
