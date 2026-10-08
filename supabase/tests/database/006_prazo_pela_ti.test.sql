-- =============================================================================
-- Testes: migration 0019 — prazo definido pela TI.
-- Rodar com:  supabase test db
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values
  ('d6000001-0000-0000-0000-000000000001', 'prazo@dommainc.com.br', '{"full_name":"Prazo"}');

create temp table fx (id bigint);
with c as (
  insert into public.chamados (titulo, categoria_id, solicitante_id, prazo_sla)
  values ('Nasce sem prazo', (select id from public.categorias where nome = 'Infraestrutura'),
          'd6000001-0000-0000-0000-000000000001', now() + interval '1 hour')
  returning id
) insert into fx select id from c;

select is(
  (select prazo_sla from public.chamados where id = (select id from fx)), null,
  'Mesmo informando, o chamado nasce sem prazo'
);

update public.chamados set prazo_sla = '2026-12-01 17:00-03' where id = (select id from fx);
select is(
  (select prazo_sla from public.chamados where id = (select id from fx)),
  '2026-12-01 17:00-03'::timestamptz,
  'Prazo definido depois fica gravado'
);

select lives_ok(
  format($$ insert into public.historico (chamado_id, autor_id, acao, detalhe, publico)
            values (%s, null, 'prazo_definido', '{"prazo":"2026-12-01T20:00:00Z"}', true) $$,
         (select id from fx)),
  'Histórico aceita o evento prazo_definido'
);

select lives_ok(
  format($$ insert into public.notificacoes (chamado_id, destinatario_id, tipo, payload)
            values (%s, 'd6000001-0000-0000-0000-000000000001', 'prazo_definido', '{}') $$,
         (select id from fx)),
  'Notificação aceita o tipo prazo_definido'
);

select * from finish();
rollback;
