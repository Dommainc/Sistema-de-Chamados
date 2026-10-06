-- =============================================================================
-- Testes: migration 0018 — domínio da DOMMA (P-005) e perfil inativo sem leitura (P-009).
-- Rodar com:  supabase test db
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('d5000001-0000-0000-0000-000000000001', 'Maria@DommaInc.com.br', '{"full_name":"Maria Domma"}'),
  ('d5000002-0000-0000-0000-000000000002', 'parceiro@gmail.com',    '{"full_name":"Parceiro"}'),
  ('d5000003-0000-0000-0000-000000000003', 'saiu@dommainc.com.br',  '{"full_name":"Saiu"}');

select is(
  (select ativo from public.profiles where id = 'd5000001-0000-0000-0000-000000000001'),
  true, 'E-mail @dommainc.com.br (maiúsculas ou não) nasce ativo'
);
select is(
  (select ativo from public.profiles where id = 'd5000002-0000-0000-0000-000000000002'),
  false, 'E-mail de outro domínio nasce inativo'
);
select is(app.email_permitido(null), false, 'Sem e-mail não é permitido');
select is(app.email_permitido('dommainc.com.br'), false, 'Texto sem @ não é permitido');
select is(
  app.email_permitido('alguem@sub.dommainc.com.br'), false, 'Subdomínio não conta como o domínio'
);

-- Chamado da pessoa que depois foi desligada (ativo = false).
create temp table fx (id bigint);
with c as (
  insert into public.chamados (titulo, categoria_id, solicitante_id)
  values ('Antes de sair', (select id from public.categorias where nome = 'Outros'),
          'd5000003-0000-0000-0000-000000000003')
  returning id
) insert into fx select id from c;
grant select on fx to authenticated;
insert into public.mensagens (chamado_id, autor_id, conteudo)
values ((select id from fx), 'd5000003-0000-0000-0000-000000000003', 'Olá');

select set_config('request.jwt.claims',
  '{"sub":"d5000003-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.chamados), 1::bigint, 'Ativo vê o próprio chamado');
reset role;

update public.profiles set ativo = false where id = 'd5000003-0000-0000-0000-000000000003';

set local role authenticated;
select is((select count(*) from public.chamados), 0::bigint, 'Inativo não vê mais o próprio chamado');
select is((select count(*) from public.mensagens), 0::bigint, 'Inativo não vê mais as mensagens');
select is(
  (select count(*) from public.profiles where id = auth.uid()), 1::bigint,
  'Inativo ainda lê o próprio perfil (para a tela "sem acesso")'
);
reset role;

select * from finish();
rollback;
