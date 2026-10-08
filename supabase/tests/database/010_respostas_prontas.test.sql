-- =============================================================================
-- Testes: migration 0023 — respostas prontas (só a TI lê; ninguém grava pela aplicação).
-- Rodar com:  supabase test db
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email, raw_user_meta_data) values
  ('da000001-0000-0000-0000-000000000001', 'sol.prontas@dommainc.com.br', '{"full_name":"Sol Prontas"}'),
  ('da000002-0000-0000-0000-000000000002', 'ti.prontas@dommainc.com.br',  '{"full_name":"TI Prontas"}');
update public.profiles set papel = 'ti' where id = 'da000002-0000-0000-0000-000000000002';

insert into public.respostas_prontas (titulo, texto, ordem, ativo)
values ('Desativada no teste', 'Não aparece', 999, false);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.respostas_prontas'::regclass),
  'RLS ligado em respostas_prontas'
);

-- ------------------------------------------------------------------- TI
select set_config('request.jwt.claims',
  '{"sub":"da000002-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select ok(
  (select count(*) from public.respostas_prontas) >= 6,
  'TI lê as respostas prontas do seed'
);
select is(
  (select count(*)::int from public.respostas_prontas where titulo = 'Desativada no teste'), 0,
  'Resposta desativada não aparece'
);
select throws_ok(
  $$ insert into public.respostas_prontas (titulo, texto) values ('Nova', 'x') $$,
  '42501', null,
  'TI não grava pela aplicação (só por SQL)'
);
select throws_ok(
  $$ update public.respostas_prontas set texto = 'x' $$,
  '42501', null,
  'TI não altera pela aplicação'
);

-- ------------------------------------------------------------------- Solicitante
reset role;
select set_config('request.jwt.claims',
  '{"sub":"da000001-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select is(
  (select count(*)::int from public.respostas_prontas), 0,
  'Solicitante não vê respostas prontas'
);

-- ------------------------------------------------------------------- Anônimo
reset role;
set local role anon;
select throws_ok(
  $$ select * from public.respostas_prontas $$,
  '42501', null,
  'Anônimo não lê'
);

select * from finish();
rollback;
