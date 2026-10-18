-- =============================================================================
-- 0032 — Resumo mensal da TI no Teams (pedido do dono para o gestor, 2026-10-18)
--
-- No 1º dia útil do mês, às 8h, o banco monta os números do mês anterior (comparados com o mês antes dele) e
-- grava um aviso `resumo_mensal` para cada pessoa de `configuracoes.resumo_mensal_para` (lista de e-mails).
-- O envio é o de sempre: fila `notificacoes` → API → Teams (ADR 0003 e 0018). O aviso não é de um chamado:
-- `notificacoes.chamado_id` passa a aceitar nulo.
-- Números (mesmo critério do Dashboard — ADR 0013), em horas úteis:
--   abertos (criados no mês) · concluídos · cancelados · em aberto no fim do mês · tempo médio até iniciar
--   (1º "assumido" no mês) e até concluir · % concluídos no prazo · satisfação média e nº de avaliações.
-- =============================================================================

alter table public.notificacoes alter column chamado_id drop not null;
alter table public.notificacoes add constraint notificacoes_chamado_ou_resumo
  check (chamado_id is not null or tipo = 'resumo_mensal');

insert into public.configuracoes (chave, valor, descricao, publico) values
  ('resumo_mensal_para', '[]'::jsonb,
   'E-mails de quem recebe o resumo mensal da TI no Teams (1º dia útil, 8h). Ex.: ["fulano@dommainc.com.br"]',
   false)
on conflict (chave) do nothing;

-- -----------------------------------------------------------------------------
-- Horas úteis entre dois instantes (espelho de horasUteisEntre em lib/dominio/horario-util.ts)
-- -----------------------------------------------------------------------------
create or replace function app.horas_uteis_entre(p_inicio timestamptz, p_fim timestamptz)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz    text := app.config_texto('fuso_horario', 'America/Sao_Paulo');
  v_ini   time := app.config_texto('expediente_inicio', '08:00')::time;
  v_fim   time := app.config_texto('expediente_fim', '18:00')::time;
  v_a     timestamp;
  v_b     timestamp;
  v_dia   date;
  v_total interval := interval '0';
  v_de    timestamp;
  v_ate   timestamp;
begin
  if p_inicio is null or p_fim is null or p_fim <= p_inicio then
    return 0;
  end if;
  v_a := p_inicio at time zone v_tz;
  v_b := p_fim at time zone v_tz;
  v_dia := v_a::date;
  while v_dia <= v_b::date loop
    if app.eh_dia_util(v_dia) then
      v_de := greatest(v_a, v_dia + v_ini);
      v_ate := least(v_b, v_dia + v_fim);
      if v_ate > v_de then
        v_total := v_total + (v_ate - v_de);
      end if;
    end if;
    v_dia := v_dia + 1;
  end loop;
  return round(extract(epoch from v_total) / 3600.0, 2);
end;
$$;

comment on function app.horas_uteis_entre(timestamptz, timestamptz) is
  'Horas úteis (expediente de configuracoes, sem feriados) entre dois instantes. 0 se fim <= início.';

-- -----------------------------------------------------------------------------
-- Números de um período [p_inicio, p_fim)
-- -----------------------------------------------------------------------------
create or replace function app.numeros_do_periodo(p_inicio timestamptz, p_fim timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with inicio_atendimento as (
    select h.chamado_id, min(h.criado_em) as em
      from public.historico h where h.acao = 'assumido' group by h.chamado_id
  ),
  concluidos as (
    select c.* from public.chamados c
     where c.status = 'concluido' and c.concluido_em >= p_inicio and c.concluido_em < p_fim
  )
  select jsonb_build_object(
    'abertos', (select count(*) from public.chamados c where c.criado_em >= p_inicio and c.criado_em < p_fim),
    'concluidos', (select count(*) from concluidos),
    'cancelados', (select count(*) from public.chamados c
                    where c.status = 'cancelado' and c.cancelado_em >= p_inicio and c.cancelado_em < p_fim),
    'em_aberto_no_fim', (select count(*) from public.chamados c
                    where c.criado_em < p_fim
                      and coalesce(c.concluido_em, c.cancelado_em, 'infinity'::timestamptz) >= p_fim),
    'horas_ate_iniciar', (select round(avg(app.horas_uteis_entre(c.criado_em, i.em)), 1)
                    from public.chamados c join inicio_atendimento i on i.chamado_id = c.id
                   where i.em >= p_inicio and i.em < p_fim),
    'horas_ate_concluir', (select round(avg(app.horas_uteis_entre(c.criado_em, c.concluido_em)), 1)
                    from concluidos c),
    'com_prazo', (select count(*) from concluidos c where c.prazo_sla is not null),
    'no_prazo', (select count(*) from concluidos c where c.prazo_sla is not null and c.concluido_em <= c.prazo_sla),
    'nota_media', (select round(avg(a.nota), 1) from public.avaliacoes a join concluidos c on c.id = a.chamado_id),
    'avaliacoes', (select count(*) from public.avaliacoes a join concluidos c on c.id = a.chamado_id)
  );
$$;

-- -----------------------------------------------------------------------------
-- Agendamento: no 1º dia útil do mês, grava o aviso (uma vez por mês e por pessoa)
-- -----------------------------------------------------------------------------
create or replace function app.agendar_resumo_mensal(p_agora timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tz        text := app.config_texto('fuso_horario', 'America/Sao_Paulo');
  v_hoje      date := (p_agora at time zone v_tz)::date;
  v_mes       date := date_trunc('month', v_hoje)::date;            -- 1º do mês atual
  v_ant       date := (v_mes - interval '1 month')::date;            -- mês do resumo
  v_ant2      date := (v_mes - interval '2 months')::date;           -- para comparar
  v_primeiro  date := v_mes;
  v_payload   jsonb;
  v_total     integer;
begin
  while not app.eh_dia_util(v_primeiro) loop
    v_primeiro := v_primeiro + 1;
  end loop;
  if v_hoje <> v_primeiro then
    return 0;
  end if;

  v_payload := jsonb_build_object(
    'mes', to_char(v_ant, 'YYYY-MM'),
    'atual', app.numeros_do_periodo(v_ant::timestamp at time zone v_tz, v_mes::timestamp at time zone v_tz),
    'anterior', app.numeros_do_periodo(v_ant2::timestamp at time zone v_tz, v_ant::timestamp at time zone v_tz)
  );

  with para as (
    select p.id
      from public.profiles p
     where p.ativo
       and lower(p.email) in (
         select lower(e) from jsonb_array_elements_text(
           coalesce((select valor from public.configuracoes where chave = 'resumo_mensal_para'), '[]'::jsonb)
         ) e)
       and not exists (
         select 1 from public.notificacoes n
          where n.tipo = 'resumo_mensal' and n.destinatario_id = p.id
            and n.payload ->> 'mes' = v_payload ->> 'mes')
  ),
  ins as (
    insert into public.notificacoes (chamado_id, destinatario_id, tipo, payload)
    select null, id, 'resumo_mensal', v_payload from para
    returning 1
  )
  select count(*) into v_total from ins;
  return v_total;
end;
$$;

comment on function app.agendar_resumo_mensal(timestamptz) is
  'No 1º dia útil do mês, grava o resumo do mês anterior para quem está em configuracoes.resumo_mensal_para.';

revoke execute on function app.horas_uteis_entre(timestamptz, timestamptz) from public;
revoke execute on function app.numeros_do_periodo(timestamptz, timestamptz) from public;
revoke execute on function app.agendar_resumo_mensal(timestamptz) from public;

-- Seg–sex às 8h de Brasília (11h UTC); a função confere se é o 1º dia útil do mês.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.schedule('resumo-mensal', '0 11 * * 1-5', 'select app.agendar_resumo_mensal()');
  end if;
end
$$;
