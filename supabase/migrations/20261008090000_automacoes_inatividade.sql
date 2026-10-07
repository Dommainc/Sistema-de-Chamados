-- =============================================================================
-- 0021 — Automações por tempo de resposta (pedido do dono, 2026-10-07 — docs/adr/0011)
--
-- A cada 5 minutos (pg_cron), app.processar_inatividade():
--   1) Chamado "em_andamento" cuja ÚLTIMA mensagem pública é da TI e já passaram 2 HORAS ÚTEIS
--      (desde essa mensagem ou desde que voltou para em andamento, o que for mais recente)
--      → vai para "aguardando_usuario" (histórico sem autor = "Sistema"; o solicitante é avisado).
--   2) Chamado aberto cuja última mensagem pública é da TI e já passaram 24 HORAS ÚTEIS dela
--      → mensagem automática no chat pedindo resposta (uma vez: depois dela, a última mensagem
--        passa a ser do sistema). Não conclui nada: quem conclui é a TI.
-- Horas úteis = app.adicionar_horas_uteis (seg–sex, expediente de configuracoes, sem feriados).
-- Quando o solicitante responde, a API já devolve para "em_andamento" (resposta_solicitante).
--
-- Mensagem do sistema: mensagens.autor_id = null e origem = 'sistema'.
-- =============================================================================

alter type public.origem_mensagem add value if not exists 'sistema';

alter table public.mensagens alter column autor_id drop not null;
-- Sem autor só a mensagem automática do sistema. (Comparação por texto: o valor novo do enum
-- não pode ser usado na mesma transação em que foi criado.)
alter table public.mensagens add constraint mensagens_autor_ou_sistema
  check (autor_id is not null or origem::text = 'sistema');

comment on column public.mensagens.autor_id is
  'Quem escreveu. Nulo só nas mensagens automáticas do sistema (origem = sistema, migration 0021).';

-- Quadro: o aviso automático (sem autor) conta como "não lida" para o solicitante, não para a TI.
create or replace view public.chamados_quadro
with (security_invoker = true) as
select
  c.id, c.titulo, c.categoria_id, c.area_id, c.solicitante_id, c.responsavel_id, c.status,
  c.prioridade, c.respostas_form, c.prazo_sla, c.criado_em, c.atualizado_em, c.concluido_em,
  c.cancelado_em, c.motivo_cancelamento,
  (select h.autor_id
     from public.historico h
    where h.chamado_id = c.id and h.acao = 'transferido'
    order by h.id desc
    limit 1) as transferido_por,
  (select count(*)::int
     from public.mensagens m
    where m.chamado_id = c.id
      and m.autor_id is distinct from auth.uid()
      and (m.autor_id is not null or not (select app.eh_ti()))
      and m.criado_em > coalesce(
            (select l.lido_ate
               from public.chamado_leituras l
              where l.chamado_id = c.id and l.profile_id = auth.uid()),
            '-infinity'::timestamptz)) as nao_lidas
from public.chamados c
where c.status not in ('concluido', 'cancelado')
   or coalesce(c.concluido_em, c.cancelado_em) >= now() - interval '7 days';

create or replace function app.processar_inatividade()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_aguardando integer;
  v_avisos     integer;
begin
  -- 1) 2 horas úteis sem resposta à TI → aguardando usuário.
  with ultimas as (
    -- Última mensagem pública de cada chamado aberto e quando ele (re)entrou em atendimento.
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
    select u.chamado_id, u.solicitante_id
    from ultimas u
    where u.status = 'em_andamento'
      and u.autor_id is not null
      and u.autor_id <> u.solicitante_id
      and app.adicionar_horas_uteis(greatest(u.criado_em, u.em_atendimento_desde), 2) <= now()
  ),
  mudou as (
    update public.chamados c
       set status = 'aguardando_usuario'
      from alvo
     where c.id = alvo.chamado_id and c.status = 'em_andamento'
    returning c.id, c.solicitante_id
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
  )
  select count(*) into v_aguardando from mudou;

  -- 2) 24 horas úteis sem resposta à TI → aviso automático no chat (uma vez).
  with ultimas as (
    -- Última mensagem pública de cada chamado aberto e quando ele (re)entrou em atendimento.
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
    select u.chamado_id, u.solicitante_id
    from ultimas u
    where u.autor_id is not null
      and u.autor_id <> u.solicitante_id
      and app.adicionar_horas_uteis(u.criado_em, 24) <= now()
  ),
  aviso as (
    insert into public.mensagens (chamado_id, autor_id, conteudo, interna, origem)
    select a.chamado_id, null,
           format('Olá, %s! Estamos aguardando sua resposta para continuar o atendimento do chamado #%s. '
                  'Se o problema já foi resolvido, é só avisar por aqui.',
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

  return v_aguardando + v_avisos;
end;
$$;

comment on function app.processar_inatividade() is
  'Automações por tempo (ADR 0011): 2 h úteis sem resposta → aguardando usuário; 24 h úteis → aviso no chat.';

revoke execute on function app.processar_inatividade() from public;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.schedule(
      'processar-inatividade',
      '*/5 * * * *',
      'select app.processar_inatividade()'
    );
  end if;
end
$$;
