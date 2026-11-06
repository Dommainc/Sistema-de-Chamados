-- =============================================================================
-- 0037 — Configurações pela tela (Fase 2, pedido do dono, 2026-11-06 — docs/adr/0022)
--
-- A TI passa a mudar pela Central (tela /atendimento/configuracoes) o que antes era só por SQL:
-- opções dos formulários (sistemas, módulos, itens), assuntos, respostas prontas, feriados e expediente.
-- Quem grava é a FastAPI (central_api), depois de conferir que o usuário é da TI (docs/adr/0002).
--
-- 1. config_alteracoes: registro de quem mudou o quê (só inserção; a TI lê).
-- 2. respostas_prontas: a API passa a gravar; a TI lê também as desativadas (a tela de
--    Configurações precisa delas — o chat filtra ativo = true).
-- Nada é apagado: retirar = desativar (assuntos, respostas, feriados) ou tirar da lista (opções).
-- =============================================================================

-- ----------------------------------------------------------------------------- 1. registro
create table public.config_alteracoes (
  id        bigint generated always as identity primary key,
  area      text not null
              check (area in ('formularios', 'assuntos', 'respostas_prontas', 'feriados', 'expediente')),
  resumo    text not null check (length(trim(resumo)) between 1 and 500),
  detalhe   jsonb not null default '{}'::jsonb check (jsonb_typeof(detalhe) = 'object'),
  autor_id  uuid not null references public.profiles (id),
  criado_em timestamptz not null default now()
);

comment on table public.config_alteracoes is
  'Quem mudou o quê na tela de Configurações (ADR 0022). Só inserção, pela API; a TI lê.';
comment on column public.config_alteracoes.resumo is
  'Frase pronta para a tela, ex.: "Qual sistema?: + Quickin · − Mapfry".';
comment on column public.config_alteracoes.detalhe is
  'Antes e depois (jsonb), para consulta.';

create index config_alteracoes_criado_em on public.config_alteracoes (criado_em desc);

alter table public.config_alteracoes enable row level security;

grant select on public.config_alteracoes to authenticated;
grant select, insert on public.config_alteracoes to central_api;

create policy config_alteracoes_leitura_ti on public.config_alteracoes
  for select to authenticated
  using ((select app.eh_ti()));

create policy api_config_alteracoes on public.config_alteracoes
  for all to central_api using (true) with check (true);

-- ----------------------------------------------------------------------------- 2. respostas prontas
grant select, insert, update on public.respostas_prontas to central_api;

create policy api_respostas_prontas on public.respostas_prontas
  for all to central_api using (true) with check (true);

drop policy respostas_prontas_leitura_ti on public.respostas_prontas;
create policy respostas_prontas_leitura_ti on public.respostas_prontas
  for select to authenticated
  using ((select app.eh_ti()));
