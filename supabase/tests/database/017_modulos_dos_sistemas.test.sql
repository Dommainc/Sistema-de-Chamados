-- =============================================================================
-- Testes: migration 0031 — "Qual módulo?" que só aparece para Sienge e CVCRM.
-- Rodar com:  supabase test db
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select is(
  (select mostrar_se from public.campos_form where chave = 'modulo_sienge'),
  '{"campo":"sistema","igual":"Sienge"}'::jsonb,
  'Módulo do Sienge só aparece com Sienge'
);
select is(
  (select opcoes ->> -1 from public.campos_form where chave = 'modulo_cvcrm'),
  'Não sei', 'A lista termina com "Não sei"'
);
select is(
  (select count(*)::int from public.campos_form where mostrar_se is not null),
  2, 'Só os dois campos de módulo têm condição'
);
select throws_ok(
  $$ update public.campos_form set mostrar_se = '{"campo": 1}'::jsonb where chave = 'modulo_sienge' $$,
  '23514', null, 'Condição em formato errado é recusada'
);

select * from finish();
rollback;
