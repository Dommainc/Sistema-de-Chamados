-- =============================================================================
-- 0036 — Ajuste na lista do "Qual sistema?" (pedido do dono, 2026-11-04)
--
-- "KickIn" passa a se chamar "Quickin" (mesma cor, rosa). Saem Mapfry, ClickUp e AnyDesk.
-- Chamados antigos guardam o texto que foi escolhido na época (respostas_form) e não mudam.
-- =============================================================================

update public.campos_form f
   set opcoes = '["Sienge","Prevision","Construpoint","Construmanager","CVCRM","Suplos","Metadados","Microsoft","Aipim Tech","Serasa","BotMaker","Stuo","Nexxera","Paytrack","Hinc","Kait","Quickin","FastBuilt","TRC","Kairos","Docusign","Não se aplica"]'::jsonb,
       cores  = '{"Sienge":"vermelho","Prevision":"roxo","Construpoint":"vermelho-claro","Construmanager":"vermelho-escuro","CVCRM":"verde-claro","Suplos":"verde-escuro","Metadados":"azul-claro","Microsoft":"azul","Aipim Tech":"ciano","Serasa":"magenta","BotMaker":"grafite","Stuo":"mostarda","Nexxera":"verde-agua","Paytrack":"verde","Hinc":"indigo","Kait":"oliva","Quickin":"rosa","FastBuilt":"marrom","TRC":"areia","Kairos":"amarelo","Docusign":"azul-escuro","Não se aplica":"cinza"}'::jsonb
  from public.categorias c
 where c.id = f.categoria_id
   and c.nome = 'Solicitações de acesso e Permissões'
   and f.chave = 'sistema';
