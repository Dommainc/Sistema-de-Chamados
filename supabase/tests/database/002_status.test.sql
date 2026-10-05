-- =============================================================================
-- Testes dos 6 status (docs/adr/0005) e da P-011 (funções sem EXECUTE público).
-- Rodar com:  supabase test db
-- Tudo roda em transação e é desfeito no final.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

-- -----------------------------------------------------------------------------
-- Massa de teste: S = solicitante, T = TI
-- -----------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('dddddddd-0000-0000-0000-000000000001', 'sol.status@domma.com.br', '{"full_name":"Solicitante Status"}'),
  ('eeeeeeee-0000-0000-0000-000000000002', 'tec.status@domma.com.br', '{"full_name":"Técnico Status"}');

update public.profiles set papel = 'ti'
 where id = 'eeeeeeee-0000-0000-0000-000000000002';

create temp table fx (nome text primary key, id bigint);

with c as (
  insert into public.chamados (titulo, categoria_id, solicitante_id)
  values ('Teste de status',
          (select id from public.categorias where nome = 'Outros'),
          'dddddddd-0000-0000-0000-000000000001')
  returning id
) insert into fx select 'chamado', id from c;

-- =============================================================================
-- Tipo e nascimento
-- =============================================================================
select enum_has_labels(
  'public', 'status_chamado',
  array['pendente', 'em_andamento', 'aguardando_usuario', 'transferido', 'concluido', 'cancelado'],
  'Enum tem exatamente os 6 status do ADR 0005'
);

select is(
  (select status::text from public.chamados where id = (select id from fx where nome = 'chamado')),
  'pendente', 'Chamado nasce pendente'
);

select throws_ok(
  format($$ insert into public.chamados (titulo, categoria_id, solicitante_id, status, responsavel_id)
            values ('Já nasce atendido', %s, 'dddddddd-0000-0000-0000-000000000001',
                    'em_andamento', 'eeeeeeee-0000-0000-0000-000000000002') $$,
         (select id from public.categorias where nome = 'Outros')),
  'CC002', null, 'Chamado não pode nascer com outro status'
);

-- =============================================================================
-- Responsável x status
-- =============================================================================
select throws_ok(
  format($$ update public.chamados set responsavel_id = 'eeeeeeee-0000-0000-0000-000000000002'
            where id = %s $$, (select id from fx where nome = 'chamado')),
  '23514', null, 'Pendente não pode ter responsável'
);

select throws_ok(
  format('update public.chamados set status = ''em_andamento'' where id = %s', (select id from fx where nome = 'chamado')),
  '23514', null, 'Em andamento exige responsável'
);

select throws_ok(
  format('update public.chamados set status = ''aguardando_usuario'' where id = %s', (select id from fx where nome = 'chamado')),
  '23514', null, 'Aguardando usuário exige responsável'
);

select throws_ok(
  format('update public.chamados set status = ''transferido'' where id = %s', (select id from fx where nome = 'chamado')),
  '23514', null, 'Transferido exige responsável (técnico de destino)'
);

select lives_ok(
  format($$ update public.chamados
              set status = 'em_andamento', responsavel_id = 'eeeeeeee-0000-0000-0000-000000000002'
            where id = %s $$, (select id from fx where nome = 'chamado')),
  'Técnico assume: em andamento com responsável'
);

select lives_ok(
  format($$ update public.chamados set status = 'pendente', responsavel_id = null where id = %s $$,
         (select id from fx where nome = 'chamado')),
  'Devolver à fila: volta a pendente sem responsável'
);

-- =============================================================================
-- Conclusão (final, somente leitura)
-- =============================================================================
update public.chamados
   set status = 'aguardando_usuario', responsavel_id = 'eeeeeeee-0000-0000-0000-000000000002'
 where id = (select id from fx where nome = 'chamado');

update public.chamados
   set status = 'concluido'
 where id = (select id from fx where nome = 'chamado');

select isnt(
  (select concluido_em from public.chamados where id = (select id from fx where nome = 'chamado')),
  null, 'Concluir (mesmo aguardando usuário) grava concluido_em'
);

select throws_ok(
  format('update public.chamados set status = ''em_andamento'' where id = %s', (select id from fx where nome = 'chamado')),
  'CC001', null, 'Concluído é final: não reabre'
);

select throws_ok(
  format($$ insert into public.mensagens (chamado_id, autor_id, conteudo)
            values (%s, 'dddddddd-0000-0000-0000-000000000001', 'Voltou o problema') $$,
         (select id from fx where nome = 'chamado')),
  'CC001', null, 'Concluído não aceita mensagens'
);

-- =============================================================================
-- Itens removidos
-- =============================================================================
select hasnt_function('app', 'fechar_resolvidos_expirados', 'Job de fechamento automático foi removido');

select is(
  (select count(*) from public.configuracoes where chave = 'dias_fechamento_automatico'),
  0::bigint, 'Configuração de fechamento automático foi removida'
);

select hasnt_column('public', 'chamados', 'resolvido_em', 'Coluna resolvido_em foi removida');
select hasnt_column('public', 'chamados', 'fechado_em',   'Coluna fechado_em foi removida');
select has_column('public', 'chamados', 'concluido_em',   'Coluna concluido_em existe');

-- =============================================================================
-- P-011: função nova nasce sem EXECUTE para PUBLIC
-- =============================================================================
create function app.teste_p011() returns integer language sql as 'select 1';

select ok(
  not has_function_privilege('authenticated', 'app.teste_p011()', 'execute'),
  'Função nova no schema app não é executável por usuário logado sem GRANT'
);

select * from finish();
rollback;
