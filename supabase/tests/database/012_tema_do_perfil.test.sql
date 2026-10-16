-- =============================================================================
-- Testes: migration 0025 — tema (claro/escuro) no perfil.
-- Rodar com:  supabase test db
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values
  ('dc000001-0000-0000-0000-000000000001', 'tema@dommainc.com.br', '{"full_name":"Tema"}');

select is(
  (select tema from public.profiles where id = 'dc000001-0000-0000-0000-000000000001'), 'claro',
  'Perfil novo começa na tela clara'
);

select lives_ok(
  $$ update public.profiles set tema = 'escuro' where id = 'dc000001-0000-0000-0000-000000000001' $$,
  'Tema escuro é aceito'
);

select throws_ok(
  $$ update public.profiles set tema = 'azul' where id = 'dc000001-0000-0000-0000-000000000001' $$,
  '23514', null, 'Só claro ou escuro'
);

-- A pessoa não grava o tema direto pelo navegador (só pela API).
select set_config('request.jwt.claims',
  '{"sub":"dc000001-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$ update public.profiles set tema = 'claro' where id = 'dc000001-0000-0000-0000-000000000001' $$,
  '42501', null, 'Navegador não altera o tema direto (só pela API)'
);
reset role;

select * from finish();
rollback;
