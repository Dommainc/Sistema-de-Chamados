-- =============================================================================
-- 0009 — Funções auxiliares de RLS
-- security definer + stable: consultas curtas por chave primária, sem
-- recursão de RLS. Nas policies, chame dentro de (select ...) para o
-- Postgres avaliar uma vez por consulta, não por linha.
-- =============================================================================

-- Usuário logado é da TI (e está ativo)?
create or replace function app.eh_ti()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.papel = 'ti' and p.ativo
  );
$$;

-- Usuário logado é o solicitante do chamado?
create or replace function app.eh_solicitante_do_chamado(p_chamado_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.chamados c
    where c.id = p_chamado_id and c.solicitante_id = auth.uid()
  );
$$;

-- Pode ver o chamado? (TI vê todos; solicitante vê os seus)
create or replace function app.pode_ver_chamado(p_chamado_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.eh_ti() or app.eh_solicitante_do_chamado(p_chamado_id);
$$;

-- A mensagem é pública (não interna)?
create or replace function app.mensagem_e_publica(p_mensagem_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.mensagens m where m.id = p_mensagem_id and not m.interna
  );
$$;

-- Pode ver o arquivo do Storage? Decide pelo registro em anexos (cobre anexos de
-- mensagens internas, que o solicitante não pode ver).
create or replace function app.pode_ver_anexo_path(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.anexos a
    where a.path = p_path
      and (
        app.eh_ti()
        or (
          app.eh_solicitante_do_chamado(a.chamado_id)
          and (a.mensagem_id is null or app.mensagem_e_publica(a.mensagem_id))
        )
      )
  );
$$;

-- Execução restrita a quem precisa.
revoke execute on all functions in schema app from public;
grant execute on function
  app.eh_ti(),
  app.eh_solicitante_do_chamado(bigint),
  app.pode_ver_chamado(bigint),
  app.mensagem_e_publica(bigint),
  app.pode_ver_anexo_path(text)
to authenticated, central_api;

grant execute on function
  app.adicionar_horas_uteis(timestamptz, numeric),
  app.adicionar_dias_uteis(timestamptz, integer),
  app.eh_dia_util(date),
  app.config_texto(text, text)
to central_api;
