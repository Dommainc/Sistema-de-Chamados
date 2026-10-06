-- =============================================================================
-- Testes: chamado_leituras (migration 0017) — RLS, grants e escrita só pela API.
-- Rodar com:  supabase test db
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

-- No Postgres 16+, quem cria um papel pode administrá-lo, mas não assumi-lo (set role).
-- Só dentro desta transação de teste (desfeito no rollback).
grant central_api to current_user;
-- As funções do pgTAP ficam em "extensions"; o central_api precisa enxergá-las durante o teste.
grant usage on schema extensions to central_api;

insert into auth.users (id, email, raw_user_meta_data) values
  ('f1111111-0000-0000-0000-000000000001', 'leitora@dommainc.com.br', '{"full_name":"Leitora"}'),
  ('f2222222-0000-0000-0000-000000000002', 'outro@dommainc.com.br',   '{"full_name":"Outro"}');

create temp table fx (id bigint);
with c as (
  insert into public.chamados (titulo, categoria_id, solicitante_id)
  values ('Teste de leitura', (select id from public.categorias where nome = 'Outros'),
          'f1111111-0000-0000-0000-000000000001')
  returning id
) insert into fx select id from c;

-- A tabela auxiliar precisa ser legível pelos papéis que o teste assume.
grant select on fx to authenticated, central_api;

insert into public.chamado_leituras (chamado_id, profile_id, lido_ate) values
  ((select id from fx), 'f1111111-0000-0000-0000-000000000001', now()),
  ((select id from fx), 'f2222222-0000-0000-0000-000000000002', now());

select has_table('public', 'chamado_leituras', 'Tabela chamado_leituras existe');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.chamado_leituras'::regclass),
  'RLS ligado em chamado_leituras'
);

-- Cada usuário só vê as próprias leituras.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"f1111111-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is(
  (select count(*) from public.chamado_leituras),
  1::bigint, 'Usuário vê só a própria leitura'
);

select throws_ok(
  format($$ insert into public.chamado_leituras (chamado_id, profile_id, lido_ate)
            values (%s, 'f1111111-0000-0000-0000-000000000001', now()) $$, (select id from fx)),
  '42501', null, 'Usuário não grava leitura direto (só pela API)'
);
reset role;

set local role central_api;
select lives_ok(
  format($$ update public.chamado_leituras set lido_ate = now()
            where chamado_id = %s and profile_id = 'f1111111-0000-0000-0000-000000000001' $$,
         (select id from fx)),
  'API atualiza a leitura'
);
select throws_ok(
  'delete from public.chamado_leituras',
  '42501', null, 'API não apaga leituras'
);
reset role;

select * from finish();
rollback;
