-- =============================================================================
-- Testes: migration 0034 — técnico não atende o próprio chamado.
-- Rodar com:  supabase test db
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

insert into auth.users (id, email, raw_user_meta_data) values
  ('d2000001-0000-0000-0000-000000000001', 'ti1.proprio@dommainc.com.br', '{"full_name":"TI Um"}'),
  ('d2000002-0000-0000-0000-000000000002', 'ti2.proprio@dommainc.com.br', '{"full_name":"TI Dois"}');
update public.profiles set papel = 'ti'
 where id in ('d2000001-0000-0000-0000-000000000001', 'd2000002-0000-0000-0000-000000000002');

create temp table fx (id bigint);
with c as (
  insert into public.chamados (titulo, categoria_id, solicitante_id)
  values ('Meu chamado', (select id from public.categorias where nome = 'Outros'), 'd2000001-0000-0000-0000-000000000001')
  returning id
) insert into fx select id from c;

select throws_ok(
  $$ update public.chamados set status = 'em_andamento', responsavel_id = 'd2000001-0000-0000-0000-000000000001'
      where id = (select id from fx) $$,
  '23514', null, 'Quem abriu não vira responsável do próprio chamado'
);
select lives_ok(
  $$ update public.chamados set status = 'em_andamento', responsavel_id = 'd2000002-0000-0000-0000-000000000002'
      where id = (select id from fx) $$,
  'Outro técnico atende normalmente'
);

select * from finish();
rollback;
