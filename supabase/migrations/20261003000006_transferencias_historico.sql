-- =============================================================================
-- 0006 — Transferências e histórico (ambos somente inserção)
-- =============================================================================

create table public.transferencias (
  id                  bigint generated always as identity primary key,
  chamado_id          bigint not null references public.chamados (id),
  de_responsavel_id   uuid references public.profiles (id),
  para_responsavel_id uuid references public.profiles (id),  -- nulo = devolvido para a fila
  de_area_id          bigint not null references public.areas (id),
  para_area_id        bigint not null references public.areas (id),
  motivo              text not null check (length(trim(motivo)) >= 3),
  autor_id            uuid not null references public.profiles (id),
  criado_em           timestamptz not null default now()
);
comment on column public.transferencias.para_responsavel_id is
  'Técnico de destino. Nulo quando o chamado volta para a fila da área.';

create table public.historico (
  id         bigint generated always as identity primary key,
  chamado_id bigint not null references public.chamados (id),
  autor_id   uuid references public.profiles (id),  -- nulo = ação automática do sistema
  acao       text not null check (acao ~ '^[a-z][a-z_]{2,49}$'),
  de         text,
  para       text,
  detalhe    jsonb not null default '{}'::jsonb,
  publico    boolean not null default true,         -- false = só a TI vê
  criado_em  timestamptz not null default now()
);
comment on column public.historico.acao is
  'Ex.: criado, status_alterado, assumido, transferido, cancelado, resolvido, reaberto, fechado_automaticamente.';
comment on column public.historico.publico is
  'Se true, aparece na linha do tempo do solicitante. Detalhes internos usam false.';

-- Somente inserção: bloqueia alteração e exclusão.
create or replace function app.bloquear_alteracao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = 'CC002',
    message = format('Registros de %s não podem ser alterados nem excluídos', tg_table_name);
end;
$$;

create trigger historico_somente_insercao
  before update or delete on public.historico
  for each row execute function app.bloquear_alteracao();

create trigger transferencias_somente_insercao
  before update or delete on public.transferencias
  for each row execute function app.bloquear_alteracao();
