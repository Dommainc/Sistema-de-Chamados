-- =============================================================================
-- Testes: migration 0035 — prazo pausado enquanto aguarda o solicitante (docs/adr/0021).
-- Dentro da transação now() não anda: a "espera" é simulada recuando sla_pausado_em.
-- Rodar com:  supabase test db
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email, raw_user_meta_data) values
  ('d2100001-0000-0000-0000-000000000001', 'ana.pausa@dommainc.com.br', '{"full_name":"Ana Pausa"}'),
  ('d2100002-0000-0000-0000-000000000002', 'ti.pausa@dommainc.com.br',  '{"full_name":"TI Pausa"}');
update public.profiles set papel = 'ti' where id = 'd2100002-0000-0000-0000-000000000002';

create temp table fx (nome text primary key, id bigint);
with c as (
  insert into public.chamados (titulo, categoria_id, solicitante_id)
  select v.titulo, (select id from public.categorias where nome = 'Outros'),
         'd2100001-0000-0000-0000-000000000001'
  from (values ('Com prazo'), ('Sem prazo'), ('Concluido aguardando')) v(titulo)
  returning id, titulo
) insert into fx select titulo, id from c;

update public.chamados
   set status = 'em_andamento', responsavel_id = 'd2100002-0000-0000-0000-000000000002'
 where id in (select id from fx);
update public.chamados set prazo_sla = '2026-11-02 12:00-03'
 where id in (select id from fx where nome in ('Com prazo', 'Concluido aguardando'));

-- 1) Entrar em "aguardando_usuario" marca o início da pausa.
update public.chamados set status = 'aguardando_usuario' where id in (select id from fx);
select is(
  (select sla_pausado_em from public.chamados where id = (select id from fx where nome = 'Com prazo')),
  now(), 'Ao entrar em Aguardando, sla_pausado_em = agora'
);

-- Simula 6 h de espera.
update public.chamados set sla_pausado_em = now() - interval '6 hours' where id in (select id from fx);

-- 2) Mudar outra coisa durante a espera não mexe na pausa.
update public.chamados set prioridade = 'alta' where id = (select id from fx where nome = 'Com prazo');
select is(
  (select sla_pausado_em from public.chamados where id = (select id from fx where nome = 'Com prazo')),
  now() - interval '6 hours', 'Prioridade durante a espera não reinicia a pausa'
);

-- 3) O solicitante respondeu: volta para em_andamento e o prazo anda 6 h.
update public.chamados set status = 'em_andamento' where id = (select id from fx where nome = 'Com prazo');
select is(
  (select prazo_sla from public.chamados where id = (select id from fx where nome = 'Com prazo')),
  '2026-11-02 18:00-03'::timestamptz, 'Prazo empurrado pelo tempo aguardando'
);
select is(
  (select sla_pausado_em from public.chamados where id = (select id from fx where nome = 'Com prazo')),
  null, 'Fora da espera, sla_pausado_em volta a nulo'
);
select is(
  (select sla_pausado_total from public.chamados where id = (select id from fx where nome = 'Com prazo')),
  interval '6 hours', 'sla_pausado_total soma a espera'
);
select results_eq(
  $$ select acao, publico, autor_id is null, detalhe->>'pausa_minutos', detalhe->>'prazo_anterior' is not null
       from public.historico
      where chamado_id = (select id from fx where nome = 'Com prazo') and acao = 'prazo_ajustado' $$,
  $$ values ('prazo_ajustado'::text, true, true, '360'::text, true) $$,
  'Grava prazo_ajustado público, automático, com a pausa em minutos'
);

-- 4) Sem prazo: a pausa conta, mas não há prazo para mexer nem evento.
update public.chamados set status = 'em_andamento' where id = (select id from fx where nome = 'Sem prazo');
select is(
  (select count(*)::int from public.historico
    where chamado_id = (select id from fx where nome = 'Sem prazo') and acao = 'prazo_ajustado'),
  0, 'Sem prazo: nenhum prazo_ajustado'
);
select is(
  (select prazo_sla from public.chamados where id = (select id from fx where nome = 'Sem prazo')),
  null, 'Sem prazo continua sem prazo'
);

-- 5) Concluído direto de Aguardando (TI ou 48 h): o prazo também anda (o "no prazo" desconta a espera).
update public.chamados set status = 'concluido'
 where id = (select id from fx where nome = 'Concluido aguardando');
select is(
  (select prazo_sla from public.chamados where id = (select id from fx where nome = 'Concluido aguardando')),
  '2026-11-02 18:00-03'::timestamptz, 'Concluir em Aguardando também empurra o prazo'
);

-- 6) A view do quadro expõe a coluna.
select has_column('public', 'chamados_quadro', 'sla_pausado_em', 'chamados_quadro tem sla_pausado_em');

select * from finish();
rollback;
