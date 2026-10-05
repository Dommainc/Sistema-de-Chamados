-- =============================================================================
-- 0016 — Categorias: ícone e nome curto (docs/ui-ux.md)
-- O portal do solicitante mostra ícone + nome curto ("Instalar programa");
-- a área técnica e os relatórios continuam com o nome completo.
-- Colunas novas em tabela existente: os GRANTs de tabela (0010) já as cobrem.
-- =============================================================================

alter table public.categorias
  add column nome_curto text
    check (nome_curto is null or length(trim(nome_curto)) between 2 and 40),
  add column icone text not null default 'ellipsis'
    check (icone ~ '^[a-z][a-z0-9-]{1,39}$');

comment on column public.categorias.nome_curto is
  'Nome exibido no portal do solicitante. Nulo = usa o nome completo.';
comment on column public.categorias.icone is
  'Nome do ícone lucide em kebab-case (ex.: key-round, wifi, printer).';
