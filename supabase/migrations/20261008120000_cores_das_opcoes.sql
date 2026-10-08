-- =============================================================================
-- 0022 — Cor de cada opção de um campo de seleção (pedido do dono, 2026-10-08)
--
-- Os sistemas da empresa (campo "Qual sistema?") têm cor própria. Até aqui a cor ficava
-- fixa no código do front; agora fica no banco, junto da opção:
--   campos_form.cores = {"Sienge": "vermelho", "CVCRM": "verde-claro", ...}
-- A cor é um nome de uma PALETA FIXA (o front traduz para os tokens sis-* do globals.css).
-- Sistema novo = acrescentar a opção em `opcoes` e a cor em `cores`, só por SQL.
-- =============================================================================

create or replace function app.cores_validas(p_cores jsonb, p_opcoes jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_cores) = 'object'
     and not exists (
       select 1
       from jsonb_each(p_cores) e
       where not (p_opcoes ? e.key)
          or jsonb_typeof(e.value) <> 'string'
          or (e.value #>> '{}') not in (
               'vermelho', 'vermelho-claro', 'vermelho-escuro', 'verde-claro',
               'azul-claro', 'azul-escuro', 'roxo', 'cinza'
             )
     );
$$;

comment on function app.cores_validas(jsonb, jsonb) is
  'campos_form.cores: objeto {opção: cor}, só com opções que existem e cores da paleta fixa.';

alter table public.campos_form
  add column cores jsonb not null default '{}'::jsonb;

alter table public.campos_form
  add constraint campos_form_cores_validas check (app.cores_validas(cores, opcoes));

comment on column public.campos_form.cores is
  'Cor de cada opção (paleta: vermelho, vermelho-claro, vermelho-escuro, verde-claro, azul-claro, '
  'azul-escuro, roxo, cinza). Opção sem cor = sem marcador.';
