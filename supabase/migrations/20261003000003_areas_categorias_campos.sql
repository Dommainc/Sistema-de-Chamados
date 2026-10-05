-- =============================================================================
-- 0003 — Áreas, categorias (com SLA) e campos do formulário dinâmico
-- =============================================================================

create table public.areas (
  id        bigint generated always as identity primary key,
  nome      text not null unique check (length(trim(nome)) between 2 and 80),
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);
comment on table public.areas is
  'Áreas que atendem chamados. Fase 1: apenas TI. Preparado para outras áreas.';

create table public.categorias (
  id            bigint generated always as identity primary key,
  area_id       bigint not null references public.areas (id),
  nome          text not null check (length(trim(nome)) between 2 and 120),
  descricao     text,
  sla_horas     numeric(6, 2) not null check (sla_horas > 0),
  ordem         integer not null default 0,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (area_id, nome)
);
comment on column public.categorias.sla_horas is
  'Prazo em horas ÚTEIS (expediente em configuracoes, descontando feriados).';

create trigger categorias_atualizado_em
  before update on public.categorias
  for each row execute function app.definir_atualizado_em();

create table public.campos_form (
  id            bigint generated always as identity primary key,
  categoria_id  bigint not null references public.categorias (id) on delete cascade,
  chave         text not null check (chave ~ '^[a-z][a-z0-9_]{1,49}$'),
  label         text not null check (length(trim(label)) between 1 and 200),
  tipo          public.tipo_campo not null,
  obrigatorio   boolean not null default false,
  opcoes        jsonb not null default '[]'::jsonb check (jsonb_typeof(opcoes) = 'array'),
  ajuda         text,
  ordem         integer not null default 0,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (categoria_id, chave),
  constraint campos_form_opcoes_selecao check (
    tipo not in ('selecao', 'multipla_selecao') or jsonb_array_length(opcoes) > 0
  )
);
comment on column public.campos_form.chave is
  'Chave estável usada em chamados.respostas_form. O label pode mudar; a chave não.';

create trigger campos_form_atualizado_em
  before update on public.campos_form
  for each row execute function app.definir_atualizado_em();
