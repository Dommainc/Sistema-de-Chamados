-- =============================================================================
-- Testes: migration 0022 — cor de cada opção (campos_form.cores).
-- Rodar com:  supabase test db
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

create temp table fx as
select f.id
from public.campos_form f
join public.categorias c on c.id = f.categoria_id
where c.nome = 'Solicitações de acesso e Permissões' and f.chave = 'sistema';

select is(
  (select cores ->> 'Sienge' from public.campos_form where id = (select id from fx)), 'vermelho',
  'Seed: Sienge em vermelho'
);

select is(
  (select count(*)::int from public.campos_form f, jsonb_array_elements_text(f.opcoes) o
    where f.id = (select id from fx) and not (f.cores ? o)),
  0,
  'Seed: todos os sistemas têm cor'
);

select throws_ok(
  $$ update public.campos_form set cores = cores || '{"Sienge":"laranja-neon"}' where id = (select id from fx) $$,
  '23514', null,
  'Cor fora da paleta é recusada'
);

select throws_ok(
  $$ update public.campos_form set cores = cores || '{"SAP":"roxo"}' where id = (select id from fx) $$,
  '23514', null,
  'Cor de uma opção que não existe é recusada'
);

select lives_ok(
  $$ update public.campos_form
        set opcoes = opcoes || '["Mega"]', cores = cores || '{"Mega":"azul-claro"}'
      where id = (select id from fx) $$,
  'Sistema novo: opção + cor da paleta, só por SQL'
);

select is(
  (select cores from public.campos_form f
     join public.categorias c on c.id = f.categoria_id
    where c.nome = 'Microsoft' and f.chave = 'programa'),
  '{}'::jsonb,
  'Campo sem cores fica com objeto vazio'
);

select * from finish();
rollback;
