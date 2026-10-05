-- =============================================================================
-- 0014 — Jobs agendados (pg_cron)
-- Fechamento automático: chamado em 'resolvido' há N dias úteis sem resposta
-- do solicitante vira 'fechado'. N = configuracoes.dias_fechamento_automatico.
-- =============================================================================

create or replace function app.fechar_resolvidos_expirados()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dias  integer := app.config_texto('dias_fechamento_automatico', '3')::integer;
  v_total integer;
begin
  with alvo as (
    select c.id
    from public.chamados c
    where c.status = 'resolvido'
      and app.adicionar_dias_uteis(c.resolvido_em, v_dias) <= now()
    for update skip locked
  ),
  fechados as (
    update public.chamados c
       set status = 'fechado', fechado_em = now()
      from alvo
     where c.id = alvo.id
    returning c.id, c.solicitante_id
  ),
  hist as (
    insert into public.historico (chamado_id, autor_id, acao, de, para, detalhe, publico)
    select f.id, null, 'fechado_automaticamente', 'resolvido', 'fechado',
           jsonb_build_object('dias_uteis', v_dias), true
    from fechados f
  ),
  notif as (
    insert into public.notificacoes (chamado_id, destinatario_id, tipo, payload)
    select f.id, f.solicitante_id, 'status_alterado',
           jsonb_build_object('de', 'resolvido', 'para', 'fechado', 'automatico', true)
    from fechados f
  )
  select count(*) into v_total from fechados;

  return v_total;
end;
$$;

revoke execute on function app.fechar_resolvidos_expirados() from public;

-- Agenda de hora em hora (só onde o pg_cron existe: Supabase local e nuvem).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.schedule(
      'fechar-chamados-resolvidos',
      '5 * * * *',
      'select app.fechar_resolvidos_expirados()'
    );
  end if;
end
$$;
