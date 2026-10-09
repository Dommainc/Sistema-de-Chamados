-- =============================================================================
-- Testes: avaliacoes (migration 0024) — pesquisa de satisfação (docs/adr/0015).
-- Rodar com:  supabase test db
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

grant central_api to current_user;
grant usage on schema extensions to central_api;

insert into auth.users (id, email, raw_user_meta_data) values
  ('db000001-0000-0000-0000-000000000001', 'sol.aval@dommainc.com.br',   '{"full_name":"Sol Aval"}'),
  ('db000002-0000-0000-0000-000000000002', 'outro.aval@dommainc.com.br', '{"full_name":"Outro Aval"}'),
  ('db000003-0000-0000-0000-000000000003', 'ti.aval@dommainc.com.br',    '{"full_name":"TI Aval"}');
update public.profiles set papel = 'ti' where id = 'db000003-0000-0000-0000-000000000003';

create temp table fx (nome text primary key, id bigint);
with c as (
  insert into public.chamados (titulo, categoria_id, solicitante_id)
  select v.titulo, (select id from public.categorias where nome = 'Outros'), v.sol::uuid
  from (values ('Concluido', 'db000001-0000-0000-0000-000000000001'),
               ('Aberto',    'db000001-0000-0000-0000-000000000001'),
               ('Do outro',  'db000002-0000-0000-0000-000000000002')) v(titulo, sol)
  returning id, titulo
) insert into fx select titulo, id from c;
grant select on fx to authenticated, central_api;

update public.chamados set status = 'em_andamento', responsavel_id = 'db000003-0000-0000-0000-000000000003'
 where id in (select id from fx where nome in ('Concluido', 'Do outro'));
update public.chamados set status = 'concluido', concluido_em = now()
 where id in (select id from fx where nome in ('Concluido', 'Do outro'));

select ok(
  (select relrowsecurity from pg_class where oid = 'public.avaliacoes'::regclass),
  'RLS ligado em avaliacoes'
);

-- ------------------------------------------------------------------- API grava
set local role central_api;
select lives_ok(
  $$ insert into public.avaliacoes (chamado_id, avaliador_id, nota, comentario)
     values ((select id from fx where nome = 'Concluido'), 'db000001-0000-0000-0000-000000000001', 5, 'Rápido!') $$,
  'Solicitante avalia o próprio chamado concluído (pela API)'
);
select throws_ok(
  $$ insert into public.avaliacoes (chamado_id, avaliador_id, nota)
     values ((select id from fx where nome = 'Concluido'), 'db000001-0000-0000-0000-000000000001', 4) $$,
  '23505', null, 'Uma avaliação por chamado'
);
select throws_ok(
  $$ insert into public.avaliacoes (chamado_id, avaliador_id, nota)
     values ((select id from fx where nome = 'Aberto'), 'db000001-0000-0000-0000-000000000001', 4) $$,
  'CC006', null, 'Chamado não concluído não é avaliado'
);
select throws_ok(
  $$ insert into public.avaliacoes (chamado_id, avaliador_id, nota)
     values ((select id from fx where nome = 'Do outro'), 'db000001-0000-0000-0000-000000000001', 4) $$,
  'CC005', null, 'Só o solicitante do chamado avalia'
);
select throws_ok(
  $$ insert into public.avaliacoes (chamado_id, avaliador_id, nota, comentario)
     values ((select id from fx where nome = 'Do outro'), 'db000002-0000-0000-0000-000000000002', 2, ' ') $$,
  '23514', null, 'Nota 1 ou 2 exige o texto'
);
select throws_ok(
  $$ insert into public.avaliacoes (chamado_id, avaliador_id, nota)
     values ((select id from fx where nome = 'Do outro'), 'db000002-0000-0000-0000-000000000002', 6) $$,
  '23514', null, 'Nota só de 1 a 5'
);
select throws_ok(
  $$ update public.avaliacoes set nota = 1 $$,
  'CC002', null, 'Avaliação não muda'
);
reset role;

-- ------------------------------------------------------------------- Leitura (RLS)
select set_config('request.jwt.claims',
  '{"sub":"db000002-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.avaliacoes), 0, 'Outro solicitante não vê a avaliação alheia');
select throws_ok(
  $$ insert into public.avaliacoes (chamado_id, avaliador_id, nota)
     values ((select id from fx where nome = 'Do outro'), 'db000002-0000-0000-0000-000000000002', 5) $$,
  '42501', null, 'Ninguém grava direto (só pela API)'
);
reset role;

select set_config('request.jwt.claims',
  '{"sub":"db000003-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select is(
  (select nota::int from public.avaliacoes where chamado_id = (select id from fx where nome = 'Concluido')),
  5, 'TI vê as avaliações'
);
reset role;

select * from finish();
rollback;
