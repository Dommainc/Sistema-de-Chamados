-- =============================================================================
-- Seed — dados iniciais (dev e primeira carga de prod)
-- Tudo aqui é editável depois pela TI na tela de Configurações.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Configurações
-- -----------------------------------------------------------------------------
insert into public.configuracoes (chave, valor, descricao, publico) values
  ('fuso_horario',               '"America/Sao_Paulo"', 'Fuso usado nos prazos', true),
  ('expediente_inicio',          '"08:00"',             'Início do expediente (prazos em horas úteis)', true),
  ('expediente_fim',             '"18:00"',             'Fim do expediente', true),
  ('sla_alerta_percentual',      '80',                  'Percentual do prazo que dispara alerta (Fase 2)', false),
  ('anexo_tamanho_max_mb',       '10',                  'Tamanho máximo por arquivo (manter igual ao bucket)', true),
  ('anexo_tipos_permitidos',
   '["image/png","image/jpeg","image/gif","image/webp","image/heic","application/pdf","text/plain","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","application/vnd.ms-powerpoint","application/vnd.openxmlformats-officedocument.presentationml.presentation"]',
   'Tipos de arquivo aceitos', true),
  ('bot_resposta_automatica',
   '"Olá! Este canal é usado apenas para avisos e as mensagens enviadas aqui não são lidas pela equipe de TI."',
   'Primeira linha da resposta automática do bot no Teams', false)
on conflict (chave) do nothing;

-- -----------------------------------------------------------------------------
-- Área
-- -----------------------------------------------------------------------------
insert into public.areas (nome) values ('TI') on conflict (nome) do nothing;

-- -----------------------------------------------------------------------------
-- Categorias (SLA em horas úteis; expediente 08–18, seg–sex)
-- -----------------------------------------------------------------------------
insert into public.categorias (area_id, nome, nome_curto, icone, descricao, sla_horas, ordem)
select a.id, c.nome, c.nome_curto, c.icone, c.descricao, c.sla, c.ordem
from public.areas a
cross join (values
  -- Reorganização do dono (2026-10-08): 4 assuntos. "Infraestrutura" junta internet, câmeras, notebook,
  -- impressora e celular; saíram Instalar programa, Novo colaborador, Desligamento e Pedir equipamento.
  ('Solicitações de acesso e Permissões', 'Solicitações de acesso e Permissões', 'key-round', 'Novo acesso, permissão ou desbloqueio nos sistemas da empresa', 2, 10),
  ('Infraestrutura',                      'Infraestrutura',            'wifi',       'Notebook, impressora, celular, internet e câmeras',    4, 20),
  -- "E-mail / Outlook" e "Teams" unificados em "Microsoft" (pedido do dono, 2026-10-07).
  ('Microsoft',                           'Microsoft',                 'grid-2x2',   'E-mail, Outlook, Teams, Word, Excel e OneDrive',       4, 30),
  ('Outros',                              'Outros pedidos para a TI',  'ellipsis',   'Qualquer outro pedido para a TI',                     16, 900)
) as c(nome, nome_curto, icone, descricao, sla, ordem)
where a.nome = 'TI'
on conflict (area_id, nome) do nothing;

-- -----------------------------------------------------------------------------
-- Campos do formulário
-- -----------------------------------------------------------------------------

-- Campo "descrição" obrigatório em todas.
insert into public.campos_form (categoria_id, chave, label, tipo, obrigatorio, ajuda, ordem)
select c.id, 'descricao', 'Descreva o que está acontecendo', 'texto_longo', true,
       'Conte o que aconteceu e, se puder, cole um print da tela (Ctrl+V).', 100
from public.categorias c
on conflict (categoria_id, chave) do nothing;

insert into public.campos_form (categoria_id, chave, label, tipo, obrigatorio, opcoes, ajuda, ordem)
select c.id, f.chave, f.label, f.tipo::public.tipo_campo, f.obrigatorio, f.opcoes::jsonb, f.ajuda, f.ordem
from public.categorias c
join (values
  ('Solicitações de acesso e Permissões', 'sistema', 'Qual sistema?', 'selecao', true,
     '["Sienge","CVCRM","Construpoint","Construmanager","Docusign","Prevision","Metadados","Não se aplica"]', null, 10),

  ('Microsoft', 'programa', 'Qual programa?', 'selecao', true,
     '["E-mail / Outlook","Teams","Word, Excel ou PowerPoint","OneDrive","Redefinição de senha","Outro"]', null, 10),

  ('Infraestrutura', 'item', 'O que é?', 'selecao', true,
     '["Notebook","Impressora / Scanner","Celular Corporativo","Internet","Câmeras"]', null, 10),
  ('Infraestrutura', 'local', 'Onde fica?', 'texto', true,
     '[]', 'Ex.: escritório central, obra X, portaria, home office', 20)
) as f(categoria, chave, label, tipo, obrigatorio, opcoes, ajuda, ordem)
  on f.categoria = c.nome
on conflict (categoria_id, chave) do nothing;

-- Cor de cada sistema (paleta fixa — migration 0022). Sistema novo: opção em `opcoes` + cor aqui.
update public.campos_form f
   set cores = '{"Sienge":"vermelho","CVCRM":"verde-claro","Construpoint":"vermelho-claro",
                 "Construmanager":"vermelho-escuro","Docusign":"azul-escuro","Prevision":"roxo",
                 "Metadados":"azul-claro","Não se aplica":"cinza"}'
  from public.categorias c
 where c.id = f.categoria_id
   and c.nome = 'Solicitações de acesso e Permissões'
   and f.chave = 'sistema'
   and f.cores = '{}'::jsonb;

-- -----------------------------------------------------------------------------
-- Respostas prontas do chat (só TI — migration 0023). {nome} = primeiro nome do solicitante.
-- -----------------------------------------------------------------------------
insert into public.respostas_prontas (titulo, texto, ordem) values
  ('Reiniciar',          'Oi, {nome}! Pode reiniciar o computador e testar de novo? Me conta se resolveu.', 10),
  ('Acesso remoto',      '{nome}, vou acessar seu computador remotamente agora. Pode deixar ele ligado e desbloqueado?', 20),
  ('Pedir print',        '{nome}, consegue me mandar um print da tela com o erro? Pode colar aqui com Ctrl+V.', 30),
  ('Testar agora',       'Pronto, {nome}! Fiz o ajuste. Pode testar e me avisar se está tudo certo?', 40),
  ('Em análise',         '{nome}, já estou vendo o seu chamado e te dou um retorno em breve.', 50),
  ('Aguardando terceiro', '{nome}, dependemos do fornecedor para seguir. Assim que tiver novidade, te aviso por aqui.', 60)
on conflict (titulo) do nothing;

-- -----------------------------------------------------------------------------
-- Feriados 2026–2027 (nacionais, estado do RJ, município do Rio)
-- Carnaval e Corpus Christi entram como ponto facultativo: desative (ativo=false)
-- se a DOMMA trabalhar nesses dias.
-- -----------------------------------------------------------------------------
insert into public.feriados (data, nome, escopo) values
  ('2026-01-01', 'Confraternização Universal', 'nacional'),
  ('2026-01-20', 'São Sebastião',              'municipal'),
  ('2026-02-16', 'Carnaval',                   'ponto_facultativo'),
  ('2026-02-17', 'Carnaval',                   'ponto_facultativo'),
  ('2026-04-03', 'Paixão de Cristo',           'nacional'),
  ('2026-04-21', 'Tiradentes',                 'nacional'),
  ('2026-04-23', 'São Jorge',                  'estadual'),
  ('2026-05-01', 'Dia do Trabalho',            'nacional'),
  ('2026-06-04', 'Corpus Christi',             'ponto_facultativo'),
  ('2026-09-07', 'Independência do Brasil',    'nacional'),
  ('2026-10-12', 'Nossa Senhora Aparecida',    'nacional'),
  ('2026-11-02', 'Finados',                    'nacional'),
  ('2026-11-15', 'Proclamação da República',   'nacional'),
  ('2026-11-20', 'Dia da Consciência Negra',   'nacional'),
  ('2026-12-25', 'Natal',                      'nacional'),

  ('2027-01-01', 'Confraternização Universal', 'nacional'),
  ('2027-01-20', 'São Sebastião',              'municipal'),
  ('2027-02-08', 'Carnaval',                   'ponto_facultativo'),
  ('2027-02-09', 'Carnaval',                   'ponto_facultativo'),
  ('2027-03-26', 'Paixão de Cristo',           'nacional'),
  ('2027-04-21', 'Tiradentes',                 'nacional'),
  ('2027-04-23', 'São Jorge',                  'estadual'),
  ('2027-05-01', 'Dia do Trabalho',            'nacional'),
  ('2027-05-27', 'Corpus Christi',             'ponto_facultativo'),
  ('2027-09-07', 'Independência do Brasil',    'nacional'),
  ('2027-10-12', 'Nossa Senhora Aparecida',    'nacional'),
  ('2027-11-02', 'Finados',                    'nacional'),
  ('2027-11-15', 'Proclamação da República',   'nacional'),
  ('2027-11-20', 'Dia da Consciência Negra',   'nacional'),
  ('2027-12-25', 'Natal',                      'nacional')
on conflict (data) do nothing;
