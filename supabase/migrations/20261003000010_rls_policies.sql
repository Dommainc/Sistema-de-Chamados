-- =============================================================================
-- 0010 — RLS em todas as tabelas + grants mínimos
--
-- Modelo (docs/adr/0002):
--   anon          -> nada
--   authenticated -> SOMENTE LEITURA, filtrada por RLS (front e FastAPI ao ler)
--                    + editar o próprio departamento/telefone
--   central_api   -> grava (FastAPI), sem DELETE e sem alterar histórico
--   service_role  -> só Storage (FastAPI) e jobs; nunca no front
-- =============================================================================

-- O Supabase concede ALL a anon/authenticated por padrão em tabelas novas do
-- schema public. Fechamos tudo e abrimos só o necessário.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

-- -----------------------------------------------------------------------------
-- RLS ligado em todas as tabelas
-- -----------------------------------------------------------------------------
alter table public.configuracoes             enable row level security;
alter table public.feriados                  enable row level security;
alter table public.areas                     enable row level security;
alter table public.categorias                enable row level security;
alter table public.campos_form               enable row level security;
alter table public.profiles                  enable row level security;
alter table public.chamados                  enable row level security;
alter table public.transferencias            enable row level security;
alter table public.historico                 enable row level security;
alter table public.mensagens                 enable row level security;
alter table public.anexos                    enable row level security;
alter table public.notificacoes              enable row level security;
alter table public.teams_conversas           enable row level security;
alter table public.bot_respostas_automaticas enable row level security;

-- -----------------------------------------------------------------------------
-- authenticated: leitura
-- -----------------------------------------------------------------------------
grant select on
  public.configuracoes, public.feriados, public.areas, public.categorias,
  public.campos_form, public.profiles, public.chamados, public.transferencias,
  public.historico, public.mensagens, public.anexos, public.notificacoes,
  public.teams_conversas, public.bot_respostas_automaticas
to authenticated;

-- O usuário só edita estas colunas do próprio perfil (papel, ativo e e-mail não).
grant update (departamento, telefone) on public.profiles to authenticated;

create policy configuracoes_leitura on public.configuracoes
  for select to authenticated
  using (publico or (select app.eh_ti()));

create policy feriados_leitura on public.feriados
  for select to authenticated
  using (true);

create policy areas_leitura on public.areas
  for select to authenticated
  using (ativo or (select app.eh_ti()));

create policy categorias_leitura on public.categorias
  for select to authenticated
  using (ativo or (select app.eh_ti()));

create policy campos_form_leitura on public.campos_form
  for select to authenticated
  using (ativo or (select app.eh_ti()));

create policy profiles_leitura on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select app.eh_ti()));

create policy profiles_edicao_propria on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy chamados_leitura on public.chamados
  for select to authenticated
  using (solicitante_id = (select auth.uid()) or (select app.eh_ti()));

create policy mensagens_leitura on public.mensagens
  for select to authenticated
  using (
    (select app.eh_ti())
    or (not interna and app.eh_solicitante_do_chamado(chamado_id))
  );

create policy anexos_leitura on public.anexos
  for select to authenticated
  using (
    (select app.eh_ti())
    or (
      app.eh_solicitante_do_chamado(chamado_id)
      and (mensagem_id is null or app.mensagem_e_publica(mensagem_id))
    )
  );

create policy historico_leitura on public.historico
  for select to authenticated
  using (
    (select app.eh_ti())
    or (publico and app.eh_solicitante_do_chamado(chamado_id))
  );

create policy transferencias_leitura on public.transferencias
  for select to authenticated
  using ((select app.eh_ti()));

create policy notificacoes_leitura on public.notificacoes
  for select to authenticated
  using ((select app.eh_ti()));

create policy teams_conversas_leitura on public.teams_conversas
  for select to authenticated
  using ((select app.eh_ti()));

create policy bot_respostas_leitura on public.bot_respostas_automaticas
  for select to authenticated
  using ((select app.eh_ti()));

-- -----------------------------------------------------------------------------
-- central_api: escrita da FastAPI. A autorização por usuário é feita pela API
-- (lendo como authenticated, sob RLS) antes de gravar.
-- -----------------------------------------------------------------------------
grant select, insert, update on
  public.configuracoes, public.areas, public.categorias, public.campos_form,
  public.profiles, public.chamados, public.notificacoes, public.teams_conversas
to central_api;

grant select, insert, update, delete on public.feriados to central_api;
grant delete on public.teams_conversas to central_api;

-- Registros somente inserção
grant select, insert on
  public.transferencias, public.historico, public.mensagens, public.anexos,
  public.bot_respostas_automaticas
to central_api;

grant usage on all sequences in schema public to central_api;

do $$
declare
  t text;
begin
  foreach t in array array[
    'configuracoes', 'feriados', 'areas', 'categorias', 'campos_form', 'profiles',
    'chamados', 'transferencias', 'historico', 'mensagens', 'anexos',
    'notificacoes', 'teams_conversas', 'bot_respostas_automaticas'
  ]
  loop
    execute format(
      'create policy %I on public.%I for all to central_api using (true) with check (true)',
      'api_' || t, t
    );
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- Nomes para chat e histórico.
-- View intencionalmente SEM security_invoker: expõe apenas colunas não
-- sensíveis de todos os perfis (o solicitante precisa ver o nome do técnico).
-- E-mail, telefone e IDs do Teams não entram.
-- -----------------------------------------------------------------------------
create view public.perfis_publicos as
  select id, nome, departamento, papel, ativo
  from public.profiles;

comment on view public.perfis_publicos is
  'Nome/departamento/papel de todos os colaboradores, para exibição. Sem dados de contato.';

revoke all on public.perfis_publicos from anon, authenticated;
grant select on public.perfis_publicos to authenticated, central_api;
