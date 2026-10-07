-- =============================================================================
-- Testes: migration 0020 — views chamados_quadro e chamados_encerrados.
-- Rodar com:  supabase test db
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email, raw_user_meta_data) values
  ('d7000001-0000-0000-0000-000000000001', 'sol.quadro@dommainc.com.br',  '{"full_name":"Sol Quadro"}'),
  ('d7000002-0000-0000-0000-000000000002', 'outro.quadro@dommainc.com.br', '{"full_name":"Outro"}'),
  ('d7000003-0000-0000-0000-000000000003', 'ti.quadro@dommainc.com.br',   '{"full_name":"TI Quadro"}'),
  ('d7000004-0000-0000-0000-000000000004', 'ti2.quadro@dommainc.com.br',  '{"full_name":"TI Dois"}');
update public.profiles set papel = 'ti'
 where id in ('d7000003-0000-0000-0000-000000000003', 'd7000004-0000-0000-0000-000000000004');

-- Chamados: aberto (do solicitante), transferido (do outro), concluído ontem e concluído há 10 dias.
create temp table fx (nome text primary key, id bigint);
grant select on fx to authenticated;
with c as (
  insert into public.chamados (titulo, categoria_id, solicitante_id)
  select v.titulo, (select id from public.categorias where nome = 'Outros'), v.sol::uuid
  from (values ('Aberto do Sol', 'd7000001-0000-0000-0000-000000000001'),
               ('Transferido do Outro', 'd7000002-0000-0000-0000-000000000002'),
               ('Concluido ontem', 'd7000001-0000-0000-0000-000000000001'),
               ('Concluido antigo', 'd7000001-0000-0000-0000-000000000001')) v(titulo, sol)
  returning id, titulo
) insert into fx select titulo, id from c;

update public.chamados
   set status = 'transferido', responsavel_id = 'd7000004-0000-0000-0000-000000000004'
 where id = (select id from fx where nome = 'Transferido do Outro');
insert into public.historico (chamado_id, autor_id, acao, de, para, detalhe, publico)
values ((select id from fx where nome = 'Transferido do Outro'),
        'd7000003-0000-0000-0000-000000000003', 'transferido', 'em_andamento', 'transferido',
        '{"motivo":"teste"}', false);
update public.chamados set status = 'em_andamento', responsavel_id = 'd7000003-0000-0000-0000-000000000003'
 where id in (select id from fx where nome like 'Concluido%');
update public.chamados set status = 'concluido', concluido_em = now() - interval '1 day'
 where id = (select id from fx where nome = 'Concluido ontem');
update public.chamados set status = 'concluido', concluido_em = now() - interval '10 days'
 where id = (select id from fx where nome = 'Concluido antigo');

-- Duas mensagens da TI no chamado do Sol; ele leu até a primeira.
insert into public.mensagens (chamado_id, autor_id, conteudo, criado_em) values
  ((select id from fx where nome = 'Aberto do Sol'), 'd7000003-0000-0000-0000-000000000003', 'um', now() - interval '2 min'),
  ((select id from fx where nome = 'Aberto do Sol'), 'd7000003-0000-0000-0000-000000000003', 'dois', now() - interval '1 min');
insert into public.chamado_leituras (chamado_id, profile_id, lido_ate)
values ((select id from fx where nome = 'Aberto do Sol'), 'd7000001-0000-0000-0000-000000000001',
        now() - interval '90 seconds');

-- ------------------------------------------------------------------- TI
select set_config('request.jwt.claims',
  '{"sub":"d7000003-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;

select bag_eq(
  $$ select titulo from public.chamados_quadro where id in (select id from fx) $$,
  $$ values ('Aberto do Sol'), ('Transferido do Outro'), ('Concluido ontem') $$,
  'Quadro: abertos + encerrados dos últimos 7 dias (o de 10 dias atrás fica de fora)'
);
select is(
  (select transferido_por::text from public.chamados_quadro
    where id = (select id from fx where nome = 'Transferido do Outro')),
  'd7000003-0000-0000-0000-000000000003',
  'Quadro traz quem transferiu (sem consulta extra ao histórico)'
);
select results_eq(
  $$ select titulo from public.chamados_encerrados where id in (select id from fx)
      order by encerrado_em desc $$,
  $$ values ('Concluido ontem'), ('Concluido antigo') $$,
  'Encerrados: todos os concluídos/cancelados, do mais recente ao mais antigo'
);
select is(
  (select nao_lidas from public.chamados_quadro where id = (select id from fx where nome = 'Aberto do Sol')),
  0, 'Mensagens que eu mesmo escrevi não contam como não lidas'
);
reset role;

-- ------------------------------------------------------------------- Solicitante
select set_config('request.jwt.claims',
  '{"sub":"d7000001-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select bag_eq(
  $$ select titulo from public.chamados_quadro where id in (select id from fx) $$,
  $$ values ('Aberto do Sol'), ('Concluido ontem') $$,
  'Solicitante só vê os próprios (RLS vale dentro da view)'
);
select is(
  (select nao_lidas from public.chamados_quadro where id = (select id from fx where nome = 'Aberto do Sol')),
  1, 'Não lidas = mensagens dos outros depois do lido_ate'
);
select is(
  (select count(*) from public.chamados_encerrados where id in (select id from fx)),
  2::bigint, 'Solicitante vê os próprios encerrados'
);
reset role;

select throws_ok(
  $$ set local role anon; select count(*) from public.chamados_quadro $$,
  '42501', null, 'Sem login não lê a view'
);

select * from finish();
rollback;
