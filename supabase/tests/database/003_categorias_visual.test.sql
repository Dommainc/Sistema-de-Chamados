-- =============================================================================
-- Testes: ícone e nome curto das categorias (migration 0016, docs/ui-ux.md).
-- Rodar com:  supabase test db
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

select has_column('public', 'categorias', 'nome_curto', 'Categoria tem nome curto');
select has_column('public', 'categorias', 'icone', 'Categoria tem ícone');

select is(
  (select count(*) from public.categorias where nome_curto is null),
  0::bigint, 'Seed define nome curto para todas as categorias'
);

select is(
  (select nome_curto from public.categorias where nome = 'Instalação de software'),
  'Instalar programa', 'Nome curto do mockup ("Instalar programa")'
);

select throws_ok(
  $$ update public.categorias set icone = 'Ícone Inválido' where nome = 'Outros' $$,
  '23514', null, 'Ícone precisa ser nome lucide em kebab-case'
);

select * from finish();
rollback;
