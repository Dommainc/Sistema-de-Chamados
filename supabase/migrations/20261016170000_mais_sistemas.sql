-- =============================================================================
-- 0030 — Mais sistemas no "Qual sistema?" (pedido do dono, 2026-10-16)
--
-- 17 sistemas novos, cada um com uma cor própria (sem repetir). Os que já existiam mantêm nome e cor
-- (CVCRM, Construmanager, Prevision, Docusign...). A paleta fixa da migration 0022 ganha 17 cores.
-- Ordem: a da lista do dono; Docusign e "Não se aplica" no fim.
-- =============================================================================

create or replace function app.cores_validas(p_cores jsonb, p_opcoes jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_cores) = 'object'
     and not exists (
       select 1
       from jsonb_each(p_cores) e
       where not (p_opcoes ? e.key)
          or jsonb_typeof(e.value) <> 'string'
          or (e.value #>> '{}') not in (
               'vermelho', 'vermelho-claro', 'vermelho-escuro', 'verde-claro', 'azul-claro', 'azul-escuro',
               'roxo', 'cinza', 'verde', 'verde-escuro', 'verde-agua', 'oliva',
               'azul', 'indigo', 'magenta', 'marrom', 'grafite', 'laranja',
               'mostarda', 'ciano', 'lilas', 'rosa', 'laranja-claro', 'areia',
               'amarelo'
             )
     );
$$;

comment on column public.campos_form.cores is
  'Cor de cada opção (paleta fixa: vermelho, vermelho-claro, vermelho-escuro, verde-claro, azul-claro, azul-escuro, roxo, cinza, verde, verde-escuro, verde-agua, oliva, azul, indigo, magenta, marrom, grafite, laranja, mostarda, ciano, lilas, rosa, laranja-claro, areia, amarelo). Opção sem cor = sem marcador.';

update public.campos_form f
   set opcoes = '["Sienge","Prevision","Construpoint","Construmanager","CVCRM","Suplos","Metadados","Microsoft","Aipim Tech","ClickUp","AnyDesk","Serasa","BotMaker","Stuo","Nexxera","Paytrack","Hinc","Mapfry","Kait","KickIn","FastBuilt","TRC","Kairos","Docusign","Não se aplica"]'::jsonb,
       cores  = '{"Sienge":"vermelho","Prevision":"roxo","Construpoint":"vermelho-claro","Construmanager":"vermelho-escuro","CVCRM":"verde-claro","Suplos":"verde-escuro","Metadados":"azul-claro","Microsoft":"azul","Aipim Tech":"ciano","ClickUp":"lilas","AnyDesk":"laranja","Serasa":"magenta","BotMaker":"grafite","Stuo":"mostarda","Nexxera":"verde-agua","Paytrack":"verde","Hinc":"indigo","Mapfry":"laranja-claro","Kait":"oliva","KickIn":"rosa","FastBuilt":"marrom","TRC":"areia","Kairos":"amarelo","Docusign":"azul-escuro","Não se aplica":"cinza"}'::jsonb
  from public.categorias c
 where c.id = f.categoria_id
   and c.nome = 'Solicitações de acesso e Permissões'
   and f.chave = 'sistema';
