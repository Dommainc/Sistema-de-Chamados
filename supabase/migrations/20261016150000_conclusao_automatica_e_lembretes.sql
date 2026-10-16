-- =============================================================================
-- 0028 — Conclusão automática em 48 h úteis, lembrete de 12 h e expediente (dono, 2026-10-16 — ADR 0019)
--
-- Contagem (a mesma da migration 0021): começa na ÚLTIMA mensagem pública da TI (ou quando o chamado voltou
-- para em andamento, o que for mais recente) e zera quando o solicitante responde. A mensagem automática
-- das 24 h não zera a contagem.
--   2 h úteis  → aguardando usuário + aviso                       (já existia)
--   12 h úteis → só o lembrete no Teams (novo: notificacoes.tipo = 'lembrete_resposta')
--   24 h úteis → mensagem automática no chat + aviso              (já existia; texto avisa das 48 h)
--   48 h úteis → CONCLUÍDO automaticamente (histórico sem autor, motivo sem_resposta_48h_uteis) (novo)
-- Se o job atrasar e vários limites vencerem juntos, só o maior gera aviso.
-- O agendamento só roda no expediente (app.processar_inatividade_agendado).
-- Base: pacote "avisos-teams" do dono, sem a parte do bot externo (o bot é a própria API — ADR 0018).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Expediente: está aberto agora? Quando abre de novo?
-- -----------------------------------------------------------------------------
create or replace function app.eh_horario_util(p_instante timestamptz)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with cfg as (
    select (p_instante at time zone app.config_texto('fuso_horario', 'America/Sao_Paulo')) as local,
           app.config_texto('expediente_inicio', '08:00')::time as ini,
           app.config_texto('expediente_fim', '18:00')::time as fim
  )
  select app.eh_dia_util(cfg.local::date) and cfg.local::time >= cfg.ini and cfg.local::time < cfg.fim
  from cfg;
$$;

comment on function app.eh_horario_util(timestamptz) is
  'Verdadeiro dentro do expediente (configuracoes) em dia útil (feriados). ADR 0019.';

-- Próximo instante com a TI trabalhando (o próprio instante, se já estiver no expediente).
-- Usado no aviso "A equipe volta amanhã às 8h" de quem abre chamado fora do expediente.
create or replace function app.proxima_abertura(p_instante timestamptz)
returns timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz    text := app.config_texto('fuso_horario', 'America/Sao_Paulo');
  v_ini   time := app.config_texto('expediente_inicio', '08:00')::time;
  v_local timestamp := p_instante at time zone v_tz;
  v_dia   date := v_local::date;
begin
  if app.eh_horario_util(p_instante) then
    return p_instante;
  end if;
  -- Antes da abertura num dia útil: hoje mesmo. Senão, o próximo dia útil.
  if not (app.eh_dia_util(v_dia) and v_local::time < v_ini) then
    v_dia := v_dia + 1;
    for i in 1..3700 loop
      exit when app.eh_dia_util(v_dia);
      v_dia := v_dia + 1;
    end loop;
  end if;
  return (v_dia + v_ini) at time zone v_tz;
end;
$$;

comment on function app.proxima_abertura(timestamptz) is
  'Quando a TI volta ao expediente (o próprio instante, se já estiver aberto). ADR 0019.';

-- -----------------------------------------------------------------------------
-- 2. Automações por tempo, agora com o instante como parâmetro (testes usam datas fixas)
-- -----------------------------------------------------------------------------
drop function if exists app.processar_inatividade();

create or replace function app.processar_inatividade(p_agora timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_concluidos integer;
  v_avisos     integer;
  v_lembretes  integer;
  v_aguardando integer;
begin
  -- As 48 h vêm primeiro: o que foi concluído não recebe os avisos menores.

  -- 1) 48 h úteis sem resposta à TI → concluído automaticamente.
  with base as (
    select c.id as chamado_id, c.status, c.solicitante_id,
           greatest(u.criado_em, coalesce(
             (select max(h.criado_em) from public.historico h
               where h.chamado_id = c.id and h.para = 'em_andamento'), u.criado_em)) as desde
    from public.chamados c
    join lateral (
      -- Última mensagem pública de uma PESSOA (o aviso automático das 24 h não conta).
      select m.autor_id, m.criado_em
      from public.mensagens m
      where m.chamado_id = c.id and not m.interna and m.autor_id is not null
      order by m.criado_em desc, m.id desc
      limit 1
    ) u on true
    where c.status in ('em_andamento', 'aguardando_usuario')
      and u.autor_id <> c.solicitante_id
  ),
  alvo as (
    select b.* from base b where app.adicionar_horas_uteis(b.desde, 48) <= p_agora
  ),
  concluidos as (
    update public.chamados c
       set status = 'concluido'
      from alvo
     where c.id = alvo.chamado_id and c.status in ('em_andamento', 'aguardando_usuario')
    returning c.id, c.solicitante_id, alvo.status::text as de
  ),
  hist as (
    insert into public.historico (chamado_id, autor_id, acao, de, para, detalhe, publico)
    select id, null, 'concluido', de, 'concluido', '{"motivo":"sem_resposta_48h_uteis"}'::jsonb, true
    from concluidos
  ),
  notif as (
    insert into public.notificacoes (chamado_id, destinatario_id, tipo, payload)
    select id, solicitante_id, 'status_alterado',
           jsonb_build_object('de', de, 'para', 'concluido', 'automatico', true,
                              'motivo', 'sem_resposta_48h_uteis')
    from concluidos
  )
  select count(*) into v_concluidos from concluidos;

  -- 2) 2 h úteis sem resposta à TI → aguardando usuário. O aviso só sai se as 12 h ainda não
  --    venceram (job atrasado: o lembrete de 12 h abaixo já cobre).
  with ultimas as (
    select c.id as chamado_id, c.status::text as status, c.solicitante_id, u.autor_id, u.criado_em,
           (select max(h.criado_em) from public.historico h
             where h.chamado_id = c.id and h.para = 'em_andamento') as em_atendimento_desde
    from public.chamados c
    join lateral (
      select m.autor_id, m.criado_em
      from public.mensagens m
      where m.chamado_id = c.id and not m.interna
      order by m.criado_em desc, m.id desc
      limit 1
    ) u on true
    where c.status in ('em_andamento', 'aguardando_usuario')
  ),
  alvo as (
    select u.chamado_id, u.solicitante_id,
           greatest(u.criado_em, u.em_atendimento_desde) as desde
    from ultimas u
    where u.status = 'em_andamento'
      and u.autor_id is not null
      and u.autor_id <> u.solicitante_id
      and app.adicionar_horas_uteis(greatest(u.criado_em, u.em_atendimento_desde), 2) <= p_agora
  ),
  mudou as (
    update public.chamados c
       set status = 'aguardando_usuario'
      from alvo
     where c.id = alvo.chamado_id and c.status = 'em_andamento'
    returning c.id, c.solicitante_id, alvo.desde
  ),
  hist as (
    insert into public.historico (chamado_id, autor_id, acao, de, para, detalhe, publico)
    select id, null, 'status_alterado', 'em_andamento', 'aguardando_usuario',
           '{"motivo":"sem_resposta_2h_uteis"}'::jsonb, true
    from mudou
  ),
  notif as (
    insert into public.notificacoes (chamado_id, destinatario_id, tipo, payload)
    select id, solicitante_id, 'status_alterado',
           jsonb_build_object('de', 'em_andamento', 'para', 'aguardando_usuario', 'automatico', true)
    from mudou
    where app.adicionar_horas_uteis(mudou.desde, 12) > p_agora
  )
  select count(*) into v_aguardando from mudou;

  -- 3) 12 h úteis sem resposta à TI → lembrete no Teams (uma vez por contagem).
  with base as (
    select c.id as chamado_id, c.solicitante_id,
           greatest(u.criado_em, coalesce(
             (select max(h.criado_em) from public.historico h
               where h.chamado_id = c.id and h.para = 'em_andamento'), u.criado_em)) as desde
    from public.chamados c
    join lateral (
      select m.autor_id, m.criado_em
      from public.mensagens m
      where m.chamado_id = c.id and not m.interna and m.autor_id is not null
      order by m.criado_em desc, m.id desc
      limit 1
    ) u on true
    where c.status in ('em_andamento', 'aguardando_usuario')
      and u.autor_id <> c.solicitante_id
  ),
  alvo as (
    select b.*
    from base b
    where app.adicionar_horas_uteis(b.desde, 12) <= p_agora
      and app.adicionar_horas_uteis(b.desde, 24) > p_agora
      and not exists (
        select 1 from public.notificacoes n
         where n.chamado_id = b.chamado_id
           and n.tipo = 'lembrete_resposta'
           and n.payload ->> 'desde' = to_jsonb(b.desde) #>> '{}'
      )
  ),
  notif as (
    insert into public.notificacoes (chamado_id, destinatario_id, tipo, payload)
    select chamado_id, solicitante_id, 'lembrete_resposta',
           jsonb_build_object('horas_uteis', 12, 'desde', desde)
    from alvo
    returning 1
  )
  select count(*) into v_lembretes from notif;

  -- 4) 24 h úteis sem resposta à TI → aviso automático no chat (uma vez) + aviso no Teams.
  with ultimas as (
    select c.id as chamado_id, c.status::text as status, c.solicitante_id, u.autor_id, u.criado_em
    from public.chamados c
    join lateral (
      select m.autor_id, m.criado_em
      from public.mensagens m
      where m.chamado_id = c.id and not m.interna
      order by m.criado_em desc, m.id desc
      limit 1
    ) u on true
    where c.status in ('em_andamento', 'aguardando_usuario')
  ),
  alvo as (
    select u.chamado_id, u.solicitante_id
    from ultimas u
    where u.autor_id is not null
      and u.autor_id <> u.solicitante_id
      and app.adicionar_horas_uteis(u.criado_em, 24) <= p_agora
  ),
  aviso as (
    insert into public.mensagens (chamado_id, autor_id, conteudo, interna, origem)
    select a.chamado_id, null,
           format('Olá, %s! Estamos aguardando sua resposta para continuar o atendimento do chamado #%s. '
                  'Se o problema já foi resolvido, é só avisar por aqui. Sem resposta, o chamado será '
                  'concluído automaticamente.',
                  split_part(p.nome, ' ', 1), a.chamado_id),
           false, 'sistema'::public.origem_mensagem
    from alvo a
    join public.profiles p on p.id = a.solicitante_id
    returning chamado_id
  ),
  notif as (
    insert into public.notificacoes (chamado_id, destinatario_id, tipo, payload)
    select a.chamado_id, a.solicitante_id, 'aviso_inatividade', jsonb_build_object('horas_uteis', 24)
    from alvo a
    where a.chamado_id in (select chamado_id from aviso)
  )
  select count(*) into v_avisos from aviso;

  return v_concluidos + v_avisos + v_lembretes + v_aguardando;
end;
$$;

comment on function app.processar_inatividade(timestamptz) is
  'Automações por tempo (ADR 0011 e 0019): 2 h úteis → aguardando usuário; 12 h → lembrete; '
  '24 h → aviso no chat; 48 h → concluído automaticamente. Sempre a partir da última mensagem da TI.';

revoke execute on function app.processar_inatividade(timestamptz) from public;

-- O pg_cron chama este: fora do expediente nada acontece (nem lembrete, nem conclusão).
create or replace function app.processar_inatividade_agendado()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app.eh_horario_util(now()) then
    return 0;
  end if;
  return app.processar_inatividade(now());
end;
$$;

revoke execute on function app.processar_inatividade_agendado() from public;

comment on column public.notificacoes.tipo is
  'Ex.: chamado_aberto, chamado_assumido, chamado_transferido, nova_mensagem, status_alterado, '
  'prazo_definido, aviso_inatividade, lembrete_resposta.';

-- -----------------------------------------------------------------------------
-- 3. Agendamento (só onde o pg_cron existe: Supabase local e nuvem)
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.unschedule(jobid) from cron.job where jobname = 'processar-inatividade';
    perform cron.schedule(
      'processar-inatividade',
      '*/5 * * * *',
      'select app.processar_inatividade_agendado()'
    );
  end if;
end
$$;
