-- =============================================================================
-- Testes: ícone e nome curto das categorias (migration 0016, docs/ui-ux.md).
-- Rodar com:  supabase test db
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

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

-- "E-mail / Outlook" e "Teams" unificados em "Microsoft" (seed, 2026-10-07).
select results_eq(
  $$ select nome from public.categorias where nome in ('Microsoft', 'E-mail / Outlook', 'Teams') $$,
  $$ values ('Microsoft'::text) $$,
  'Só existe a categoria Microsoft (E-mail / Outlook e Teams foram unificados)'
);
select is(
  (select f.tipo::text from public.campos_form f join public.categorias c on c.id = f.categoria_id
    where c.nome = 'Microsoft' and f.chave = 'programa'),
  'selecao',
  'Microsoft pergunta "Qual programa?"'
);

select is(
  (select f.opcoes from public.campos_form f join public.categorias c on c.id = f.categoria_id
    where c.nome = 'Internet / Infraestrutura' and f.chave = 'item'),
  '["Internet / Wi-Fi","VPN","Câmeras","Cabeamento / ponto de rede"]'::jsonb,
  'Internet / Infraestrutura pergunta "O que é?" (internet, VPN, câmeras e cabeamento)'
);
select is(
  (select f.opcoes from public.campos_form f join public.categorias c on c.id = f.categoria_id
    where c.nome = 'Solicitações de acesso e Permissões' and f.chave = 'sistema'),
  '["Sienge","CVCRM","Construpoint","Construmanager","Docusign","Prevision","Metadados","Não se aplica"]'::jsonb,
  'Acessos e permissões pergunta "Qual sistema?" com os 8 sistemas'
);
select is(
  (select count(*) from public.categorias
    where nome in ('Acesso, senha e bloqueio de conta', 'Sistemas da empresa', 'Internet, rede ou VPN', 'Infraestrutura')),
  0::bigint, 'Categorias antigas foram unificadas'
);

select * from finish();
rollback;
