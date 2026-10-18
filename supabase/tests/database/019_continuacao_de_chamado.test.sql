-- =============================================================================
-- Testes: migration 0033 — "O problema voltou" (chamado novo ligado a um concluído).
-- Rodar com:  supabase test db
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values
  ('d1900001-0000-0000-0000-000000000001', 'sol.voltou@dommainc.com.br',   '{"full_name":"Sol Voltou"}'),
  ('d1900002-0000-0000-0000-000000000002', 'outro.voltou@dommainc.com.br', '{"full_name":"Outro Voltou"}'),
  ('d1900003-0000-0000-0000-000000000003', 'ti.voltou@dommainc.com.br',    '{"full_name":"TI Voltou"}');
update public.profiles set papel = 'ti' where id = 'd1900003-0000-0000-0000-000000000003';

create temp table fx (nome text primary key, id bigint);
with c as (
  insert into public.chamados (titulo, categoria_id, solicitante_id)
  select v.titulo, (select id from public.categorias where nome = 'Outros'), 'd1900001-0000-0000-0000-000000000001'
  from (values ('concluido'), ('aberto')) v(titulo)
  returning id, titulo
) insert into fx select titulo, id from c;
update public.chamados set status = 'em_andamento', responsavel_id = 'd1900003-0000-0000-0000-000000000003' where id = (select id from fx where nome = 'concluido');
update public.chamados set status = 'concluido' where id = (select id from fx where nome = 'concluido');

select lives_ok(
  format($$ insert into public.chamados (titulo, categoria_id, solicitante_id, continuacao_de)
            values ('Voltou', (select id from public.categorias where nome = 'Outros'),
                    'd1900001-0000-0000-0000-000000000001', %s) $$, (select id from fx where nome = 'concluido')),
  'Continuação de um chamado concluído do mesmo solicitante'
);

select throws_ok(
  format($$ insert into public.chamados (titulo, categoria_id, solicitante_id, continuacao_de)
            values ('Voltou', (select id from public.categorias where nome = 'Outros'),
                    'd1900001-0000-0000-0000-000000000001', %s) $$, (select id from fx where nome = 'aberto')),
  'CC006', null, 'Não pode continuar um chamado que ainda está aberto'
);

select throws_ok(
  format($$ insert into public.chamados (titulo, categoria_id, solicitante_id, continuacao_de)
            values ('Voltou', (select id from public.categorias where nome = 'Outros'),
                    'd1900002-0000-0000-0000-000000000002', %s) $$, (select id from fx where nome = 'concluido')),
  'CC006', null, 'Não pode continuar o chamado de outra pessoa'
);

select throws_ok(
  format($$ update public.chamados set continuacao_de = %s where id = %s $$,
         (select id from fx where nome = 'concluido'), (select id from fx where nome = 'aberto')),
  'CC002', null, 'A ligação não muda depois de criada'
);

select * from finish();
rollback;
