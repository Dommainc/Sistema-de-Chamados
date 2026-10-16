-- =============================================================================
-- Testes: migration 0026 — a TI vê a leitura do solicitante ("visto" no chat).
-- Rodar com:  supabase test db
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values
  ('dd000001-0000-0000-0000-000000000001', 'sol.visto@dommainc.com.br', '{"full_name":"Sol Visto"}'),
  ('dd000002-0000-0000-0000-000000000002', 'ti.visto@dommainc.com.br',  '{"full_name":"TI Visto"}'),
  ('dd000003-0000-0000-0000-000000000003', 'out.visto@dommainc.com.br', '{"full_name":"Outro Visto"}');
update public.profiles set papel = 'ti' where id = 'dd000002-0000-0000-0000-000000000002';

create temp table fx (id bigint);
with c as (
  insert into public.chamados (titulo, categoria_id, solicitante_id)
  values ('Visto', (select id from public.categorias where nome = 'Outros'), 'dd000001-0000-0000-0000-000000000001')
  returning id
) insert into fx select id from c;
grant select on fx to authenticated;

insert into public.chamado_leituras (chamado_id, profile_id, lido_ate) values
  ((select id from fx), 'dd000001-0000-0000-0000-000000000001', now()),
  ((select id from fx), 'dd000002-0000-0000-0000-000000000002', now());

-- TI: vê a leitura do solicitante (e a própria).
select set_config('request.jwt.claims', '{"sub":"dd000002-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is(
  (select count(*)::int from public.chamado_leituras
    where chamado_id = (select id from fx) and profile_id = 'dd000001-0000-0000-0000-000000000001'),
  1, 'TI vê até quando o solicitante leu'
);
reset role;

-- Solicitante: só a própria leitura (não vê se a TI leu).
select set_config('request.jwt.claims', '{"sub":"dd000001-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(
  (select count(*)::int from public.chamado_leituras where chamado_id = (select id from fx)),
  1, 'Solicitante vê só a própria leitura'
);
select is(
  (select count(*)::int from public.chamado_leituras
    where chamado_id = (select id from fx) and profile_id = 'dd000002-0000-0000-0000-000000000002'),
  0, 'Solicitante não vê se a TI leu'
);
reset role;

-- Outra pessoa (não TI): nada.
select set_config('request.jwt.claims', '{"sub":"dd000003-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select is(
  (select count(*)::int from public.chamado_leituras where chamado_id = (select id from fx)),
  0, 'Outro solicitante não vê leituras do chamado'
);
reset role;

select * from finish();
rollback;
