-- =============================================================================
-- Testes: migration 0032 — resumo mensal da TI (horas úteis, números do mês e agendamento).
-- Datas em 2030 para não misturar com os dados de exemplo. Expediente do seed: seg–sex, 8h–20h.
-- Rodar com:  supabase test db
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

-- ----------------------------------------------------------------------------- horas úteis
select is(app.horas_uteis_entre('2030-03-04 09:00-03', '2030-03-04 12:00-03'), 3.00, 'Mesmo dia: 3 h');
select is(app.horas_uteis_entre('2030-03-08 19:00-03', '2030-03-11 09:00-03'), 2.00,
  'Sexta 19h → segunda 9h: 2 h (fim de semana não conta)');
select is(app.horas_uteis_entre('2030-03-04 12:00-03', '2030-03-04 09:00-03'), 0::numeric, 'Fim antes do início: 0');

-- ----------------------------------------------------------------------------- dados de março/2030
insert into auth.users (id, email, raw_user_meta_data) values
  ('d1800001-0000-0000-0000-000000000001', 'sol.resumo@dommainc.com.br',    '{"full_name":"Sol Resumo"}'),
  ('d1800002-0000-0000-0000-000000000002', 'gestor.resumo@dommainc.com.br', '{"full_name":"Gestor Resumo"}');
update public.profiles set papel = 'ti' where id = 'd1800002-0000-0000-0000-000000000002';

create temp table fx (nome text primary key, id bigint);
with c as (
  insert into public.chamados (titulo, categoria_id, solicitante_id, criado_em)
  select v.titulo, (select id from public.categorias where nome = 'Outros'),
         'd1800001-0000-0000-0000-000000000001', v.criado::timestamptz
  from (values ('concluido', '2030-03-04 09:00-03'),
               ('cancelado', '2030-03-05 09:00-03'),
               ('aberto',    '2030-03-06 09:00-03')) v(titulo, criado)
  returning id, titulo
) insert into fx select titulo, id from c;

insert into public.historico (chamado_id, autor_id, acao, de, para, criado_em)
select id, 'd1800002-0000-0000-0000-000000000002', 'assumido', 'pendente', 'em_andamento', '2030-03-04 10:00-03'
from fx where nome = 'concluido';
update public.chamados set status = 'em_andamento', responsavel_id = 'd1800002-0000-0000-0000-000000000002',
       prazo_sla = '2030-03-05 12:00-03'
 where id = (select id from fx where nome = 'concluido');
update public.chamados set status = 'concluido', concluido_em = '2030-03-04 12:00-03'
 where id = (select id from fx where nome = 'concluido');
update public.chamados set status = 'cancelado', cancelado_em = '2030-03-05 10:00-03', motivo_cancelamento = 'Teste do resumo'
 where id = (select id from fx where nome = 'cancelado');
insert into public.avaliacoes (chamado_id, avaliador_id, nota)
values ((select id from fx where nome = 'concluido'), 'd1800001-0000-0000-0000-000000000001', 4);

create temp table numeros as
select app.numeros_do_periodo('2030-03-01 00:00-03', '2030-04-01 00:00-03') as n;

select is((select (n ->> 'abertos')::int from numeros), 3, 'Março: 3 abertos');
select is((select (n ->> 'concluidos')::int || '/' || (n ->> 'cancelados') from numeros), '1/1', '1 concluído e 1 cancelado');
select is((select (n ->> 'em_aberto_no_fim')::int from numeros), 1, '1 ainda aberto no fim do mês');
select is((select n ->> 'horas_ate_iniciar' from numeros), '1.0', 'Até iniciar: 1 h útil');
select is((select (n ->> 'no_prazo') || '/' || (n ->> 'com_prazo') from numeros), '1/1', 'Concluído dentro do prazo');
select is((select (n ->> 'nota_media') || ' (' || (n ->> 'avaliacoes') || ')' from numeros), '4.0 (1)', 'Nota média e quantidade');

-- ----------------------------------------------------------------------------- agendamento
update public.configuracoes set valor = '["Gestor.Resumo@dommainc.com.br"]'::jsonb where chave = 'resumo_mensal_para';
select is(app.agendar_resumo_mensal('2030-04-02 08:05-03'), 0, 'Fora do 1º dia útil (terça 02/04): nada');
select is(
  app.agendar_resumo_mensal('2030-04-01 08:05-03') + app.agendar_resumo_mensal('2030-04-01 09:05-03'), 1,
  '1º dia útil (segunda 01/04): um aviso para o gestor, sem repetir'
);

select * from finish();
rollback;
