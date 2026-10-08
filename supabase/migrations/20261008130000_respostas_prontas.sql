-- =============================================================================
-- 0023 — Respostas prontas do chat (pedido do dono, 2026-10-08)
--
-- Frases que a TI usa toda hora ("Pode reiniciar e testar de novo?"). No chat com o
-- solicitante, o técnico escolhe uma e o texto entra no campo de mensagem (editável;
-- nada é enviado sozinho). "{nome}" vira o primeiro nome do solicitante.
-- Lista única para toda a TI, configurada por SQL (como as categorias — Fase 1).
-- Só a TI lê; ninguém grava pela aplicação.
-- =============================================================================

create table public.respostas_prontas (
  id            bigint generated always as identity primary key,
  titulo        text not null unique check (length(trim(titulo)) between 1 and 60),
  texto         text not null check (length(trim(texto)) between 1 and 2000),
  ordem         integer not null default 0,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.respostas_prontas is
  'Respostas prontas do chat (só TI). "{nome}" = primeiro nome do solicitante.';

create trigger respostas_prontas_atualizado_em
  before update on public.respostas_prontas
  for each row execute function app.definir_atualizado_em();

alter table public.respostas_prontas enable row level security;

grant select on public.respostas_prontas to authenticated;

create policy respostas_prontas_leitura_ti on public.respostas_prontas
  for select to authenticated
  using (ativo and (select app.eh_ti()));
