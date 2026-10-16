-- =============================================================================
-- Testes: migration 0030 — mais sistemas, cada um com uma cor sem repetir.
-- Rodar com:  supabase test db
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

create temp view sistema as
select f.opcoes, f.cores
from public.campos_form f join public.categorias c on c.id = f.categoria_id
where c.nome = 'Solicitações de acesso e Permissões' and f.chave = 'sistema';

select is((select jsonb_array_length(opcoes) from sistema), 25, '25 opções no "Qual sistema?"');
select is(
  (select count(distinct value) from sistema, jsonb_each_text(cores)),
  (select count(*) from sistema, jsonb_each_text(cores)),
  'Nenhuma cor repetida'
);
select is((select cores ->> 'Sienge' from sistema), 'vermelho', 'Sienge mantém o vermelho');
select is((select cores ->> 'Paytrack' from sistema), 'verde', 'Paytrack com a cor nova');
select throws_ok(
  $$ update public.campos_form set cores = cores || '{"Sienge":"fucsia"}'::jsonb
      where chave = 'sistema' $$,
  '23514', null, 'Cor fora da paleta é recusada'
);

select * from finish();
rollback;
