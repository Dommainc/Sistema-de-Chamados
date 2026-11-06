-- =============================================================================
-- Testes: migration 0037 — configurações pela tela (docs/adr/0022).
-- Rodar com:  supabase test db
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);
grant central_api to current_user;  -- para assumir o papel da API (só nesta transação)

insert into auth.users (id, email, raw_user_meta_data) values
  ('d2200001-0000-0000-0000-000000000001', 'sol.config@dommainc.com.br', '{"full_name":"Sol Config"}'),
  ('d2200002-0000-0000-0000-000000000002', 'ti.config@dommainc.com.br',  '{"full_name":"TI Config"}');
update public.profiles set papel = 'ti' where id = 'd2200002-0000-0000-0000-000000000002';

insert into public.config_alteracoes (area, resumo, autor_id)
values ('formularios', 'Qual sistema?: + Teste', 'd2200002-0000-0000-0000-000000000002');
insert into public.respostas_prontas (titulo, texto, ordem, ativo)
values ('Desativada config', 'Só a tela de Configurações vê', 999, false);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.config_alteracoes'::regclass),
  'RLS ligado em config_alteracoes'
);
select throws_ok(
  $$ insert into public.config_alteracoes (area, resumo, autor_id)
     values ('outra', 'x', 'd2200002-0000-0000-0000-000000000002') $$,
  '23514', null, 'Área fora da lista é recusada'
);

-- ------------------------------------------------------------------- TI
select set_config('request.jwt.claims',
  '{"sub":"d2200002-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select is(
  (select count(*)::int from public.config_alteracoes where resumo = 'Qual sistema?: + Teste'), 1,
  'TI lê o registro de alterações'
);
select throws_ok(
  $$ insert into public.config_alteracoes (area, resumo, autor_id)
     values ('feriados', 'x', 'd2200002-0000-0000-0000-000000000002') $$,
  '42501', null, 'TI não grava o registro direto (só a API)'
);
select is(
  (select count(*)::int from public.respostas_prontas where titulo = 'Desativada config'), 1,
  'TI vê também as respostas desativadas (tela de Configurações)'
);
select throws_ok(
  $$ update public.respostas_prontas set texto = 'x' $$,
  '42501', null, 'TI continua sem alterar direto (só a API)'
);

-- ------------------------------------------------------------------- Solicitante
reset role;
select set_config('request.jwt.claims',
  '{"sub":"d2200001-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select is((select count(*)::int from public.config_alteracoes), 0, 'Solicitante não lê o registro');
select is((select count(*)::int from public.respostas_prontas), 0, 'Solicitante não vê respostas prontas');

-- ------------------------------------------------------------------- central_api
reset role;
set local role central_api;

select lives_ok(
  $$ insert into public.respostas_prontas (titulo, texto, ordem) values ('Nova pela API', 'Oi, {nome}!', 50) $$,
  'A API cria resposta pronta'
);
select lives_ok(
  $$ update public.respostas_prontas set ativo = false where titulo = 'Nova pela API' $$,
  'A API desativa resposta pronta'
);
select throws_ok(
  $$ update public.config_alteracoes set resumo = 'mudado' $$,
  '42501', null, 'O registro de alterações não pode ser editado'
);

reset role;
select * from finish();
rollback;
