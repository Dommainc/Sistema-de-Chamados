-- =============================================================================
-- 0031 — Pergunta que só aparece se... ("Qual módulo?" do Sienge e do CVCRM — dono, 2026-10-16)
--
-- campos_form.mostrar_se = {"campo": "sistema", "igual": "Sienge"}: o campo só aparece (e só é
-- obrigatório) quando a resposta de outro campo da mesma categoria é aquele valor. Nulo = sempre aparece.
-- Outro sistema com módulos no futuro = mais um campo assim, só por SQL. A lista termina com "Não sei".
-- =============================================================================

alter table public.campos_form
  add column mostrar_se jsonb
  constraint campos_form_mostrar_se_valido check (
    mostrar_se is null or (
      jsonb_typeof(mostrar_se) = 'object'
      and jsonb_typeof(mostrar_se -> 'campo') = 'string'
      and jsonb_typeof(mostrar_se -> 'igual') = 'string'
    )
  );

comment on column public.campos_form.mostrar_se is
  'Condição para o campo aparecer: {"campo": <chave de outro campo>, "igual": <valor>}. Nulo = sempre.';

insert into public.campos_form
  (categoria_id, chave, label, tipo, obrigatorio, opcoes, ajuda, ordem, mostrar_se)
select c.id, m.chave, m.label, 'selecao', true, m.opcoes::jsonb, null, 15, m.mostrar_se::jsonb
from public.categorias c
cross join (values
  ('modulo_sienge', 'Qual módulo do Sienge?', '["Engenharia","Suprimentos","Financeiro","Notas Fiscais","Contabilidade / Fiscal","Comercial","Suporte à decisão","Administrativo","Gestão da Qualidade","Gestão de Ativos","Segurança / Apoio","Não sei"]', '{"campo":"sistema","igual":"Sienge"}'),
  ('modulo_cvcrm', 'Qual módulo do CVCRM?', '["Cadastros","Lead","Pré-cadastros","Reservas","Comissões","Repasse","Relacionamento","Relatórios","Configurações","Não sei"]', '{"campo":"sistema","igual":"CVCRM"}')
) as m(chave, label, opcoes, mostrar_se)
where c.nome = 'Solicitações de acesso e Permissões'
on conflict (categoria_id, chave) do nothing;
