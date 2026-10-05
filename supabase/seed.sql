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
insert into public.categorias (area_id, nome, descricao, sla_horas, ordem)
select a.id, c.nome, c.descricao, c.sla, c.ordem
from public.areas a
cross join (values
  ('Acesso, senha e bloqueio de conta', 'Não consigo entrar, esqueci a senha, conta bloqueada', 2, 10),
  ('Internet, rede ou VPN',             'Sem internet, Wi-Fi ou VPN fora do ar',                2, 20),
  ('E-mail / Outlook',                  'Problemas para enviar, receber ou configurar e-mail',  4, 30),
  ('Teams',                             'Chamadas, reuniões, chats e equipes',                  4, 40),
  ('Computador ou notebook',            'Lento, travando, não liga ou com defeito',             8, 50),
  ('Impressora / scanner',              'Não imprime, papel preso, scanner',                    8, 60),
  ('Celular corporativo',               'Configuração, defeito ou troca',                       8, 70),
  ('Sistemas da empresa',               'Erro ou dúvida em sistemas internos',                  8, 80),
  ('Instalação de software',            'Instalar ou atualizar um programa',                   16, 90),
  ('Novo colaborador',                  'Preparar acessos e equipamento para quem vai entrar', 24, 100),
  ('Desligamento',                      'Bloquear acessos e recolher equipamento',              4, 110),
  ('Compra ou solicitação de equipamento', 'Pedir mouse, monitor, headset, notebook...',       40, 120),
  ('Outros',                            'Qualquer outro pedido para a TI',                     16, 900)
) as c(nome, descricao, sla, ordem)
where a.nome = 'TI'
on conflict (area_id, nome) do nothing;

-- -----------------------------------------------------------------------------
-- Campos do formulário
-- -----------------------------------------------------------------------------

-- Campo "descrição" obrigatório em todas, exceto as que têm formulário próprio.
insert into public.campos_form (categoria_id, chave, label, tipo, obrigatorio, ajuda, ordem)
select c.id, 'descricao', 'Descreva o que está acontecendo', 'texto_longo', true,
       'Conte o que aconteceu e, se puder, cole um print da tela (Ctrl+V).', 100
from public.categorias c
where c.nome not in ('Novo colaborador', 'Desligamento')
on conflict (categoria_id, chave) do nothing;

insert into public.campos_form (categoria_id, chave, label, tipo, obrigatorio, opcoes, ajuda, ordem)
select c.id, f.chave, f.label, f.tipo::public.tipo_campo, f.obrigatorio, f.opcoes::jsonb, f.ajuda, f.ordem
from public.categorias c
join (values
  ('Acesso, senha e bloqueio de conta', 'acesso_a', 'Qual acesso?', 'selecao', true,
     '["Computador / conta Microsoft","E-mail","Sistemas da empresa","Wi-Fi","Outro"]', null, 10),

  ('Internet, rede ou VPN', 'alcance', 'Quem está sem conexão?', 'selecao', true,
     '["Só eu","Algumas pessoas do setor","O escritório / obra inteira"]', null, 10),
  ('Internet, rede ou VPN', 'local', 'Onde você está?', 'texto', true,
     '[]', 'Ex.: escritório central, obra X, home office', 20),

  ('Computador ou notebook', 'patrimonio', 'Número de patrimônio', 'texto', false,
     '[]', 'Etiqueta colada no equipamento, se houver', 10),

  ('Impressora / scanner', 'local', 'Onde fica a impressora?', 'texto', true,
     '[]', 'Ex.: 3º andar, sala do financeiro', 10),

  ('Instalação de software', 'software', 'Qual programa?', 'texto', true, '[]', null, 10),
  ('Instalação de software', 'justificativa', 'Para que você precisa dele?', 'texto_longo', true, '[]', null, 20),

  ('Compra ou solicitação de equipamento', 'item', 'O que você precisa?', 'texto', true, '[]', null, 10),
  ('Compra ou solicitação de equipamento', 'justificativa', 'Por que precisa?', 'texto_longo', true, '[]', null, 20),

  ('Novo colaborador', 'nome_colaborador', 'Nome completo de quem vai entrar', 'texto', true, '[]', null, 10),
  ('Novo colaborador', 'data_inicio', 'Data de início', 'data', true, '[]', null, 20),
  ('Novo colaborador', 'cargo', 'Cargo', 'texto', true, '[]', null, 30),
  ('Novo colaborador', 'departamento', 'Departamento', 'texto', true, '[]', null, 40),
  ('Novo colaborador', 'equipamento', 'Precisa de equipamento?', 'selecao', true,
     '["Notebook","Desktop","Não precisa"]', null, 50),
  ('Novo colaborador', 'observacoes', 'Observações', 'texto_longo', false,
     '[]', 'Sistemas específicos, pastas compartilhadas, celular...', 60),

  ('Desligamento', 'nome_colaborador', 'Nome completo de quem está saindo', 'texto', true, '[]', null, 10),
  ('Desligamento', 'data_desligamento', 'Último dia de trabalho', 'data', true, '[]', null, 20),
  ('Desligamento', 'observacoes', 'Observações', 'texto_longo', false,
     '[]', 'Ex.: redirecionar e-mails para o gestor', 30)
) as f(categoria, chave, label, tipo, obrigatorio, opcoes, ajuda, ordem)
  on f.categoria = c.nome
on conflict (categoria_id, chave) do nothing;

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
