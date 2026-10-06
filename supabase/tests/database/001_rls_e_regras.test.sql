-- =============================================================================
-- Testes do banco: RLS, permissões, travas de integridade e prazo.
-- Regras dos status (ADR 0005): 002_status.test.sql
-- Rodar com:  supabase test db
-- Tudo roda em transação e é desfeito no final.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(33);

-- No Postgres 16+, quem cria um papel pode administrá-lo, mas não assumi-lo (set role).
-- Só dentro desta transação de teste (desfeito no rollback).
grant central_api to current_user;

-- -----------------------------------------------------------------------------
-- Auxiliares: executar SQL como um usuário/papel e devolver SQLSTATE ou 'ok'
-- -----------------------------------------------------------------------------
create function pg_temp.executar_como(p_papel text, p_usuario uuid, p_sql text)
returns text
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_usuario, 'role', p_papel)::text, true);
  execute 'set local role ' || quote_ident(p_papel);
  begin
    execute p_sql;
    execute 'reset role';
    return 'ok';
  exception when others then
    execute 'reset role';
    return sqlstate;
  end;
end;
$$;

create function pg_temp.contar_como(p_usuario uuid, p_sql text)
returns bigint
language plpgsql
as $$
declare
  v bigint;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  execute format('select count(*) from (%s) s', p_sql) into v;
  execute 'reset role';
  return v;
end;
$$;

-- -----------------------------------------------------------------------------
-- Massa de teste
-- A e B: solicitantes. T: TI.
-- -----------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000001-0000-0000-0000-000000000001', 'ana@domma.com.br',   '{"full_name":"Ana Teste"}'),
  ('b0000002-0000-0000-0000-000000000002', 'bruno@domma.com.br', '{"full_name":"Bruno Teste"}'),
  ('c0000003-0000-0000-0000-000000000003', 'tec@domma.com.br',   '{"full_name":"Técnico Teste"}');

update public.profiles set papel = 'ti'
 where id = 'c0000003-0000-0000-0000-000000000003';

create temp table fx (nome text primary key, id bigint);

with c as (
  insert into public.chamados (titulo, categoria_id, solicitante_id)
  values ('Sem internet',
          (select id from public.categorias where nome = 'Internet, rede ou VPN'),
          'a0000001-0000-0000-0000-000000000001')
  returning id
) insert into fx select 'chamado_a', id from c;

with c as (
  insert into public.chamados (titulo, categoria_id, solicitante_id)
  values ('Impressora travada',
          (select id from public.categorias where nome = 'Impressora / scanner'),
          'b0000002-0000-0000-0000-000000000002')
  returning id
) insert into fx select 'chamado_b', id from c;

with m as (
  insert into public.mensagens (chamado_id, autor_id, conteudo, interna) values
    ((select id from fx where nome = 'chamado_a'), 'a0000001-0000-0000-0000-000000000001', 'Caiu tudo', false)
  returning id
) insert into fx select 'msg_publica', id from m;

with m as (
  insert into public.mensagens (chamado_id, autor_id, conteudo, interna) values
    ((select id from fx where nome = 'chamado_a'), 'c0000003-0000-0000-0000-000000000003', 'Verificar switch', true)
  returning id
) insert into fx select 'msg_interna', id from m;

insert into public.historico (chamado_id, autor_id, acao, publico) values
  ((select id from fx where nome = 'chamado_a'), 'a0000001-0000-0000-0000-000000000001', 'criado', true),
  ((select id from fx where nome = 'chamado_a'), 'c0000003-0000-0000-0000-000000000003', 'nota_interna', false);

-- =============================================================================
-- Número do chamado e prazo
-- =============================================================================
select is(
  (select id from fx where nome = 'chamado_b'),
  (select id from fx where nome = 'chamado_a') + 1,
  'Números dos chamados são sequenciais'
);

select isnt(
  (select prazo_sla from public.chamados where id = (select id from fx where nome = 'chamado_a')),
  null,
  'Prazo é calculado na abertura'
);

select is(
  app.adicionar_horas_uteis('2026-10-02 17:00-03', 2),
  '2026-10-05 09:00-03'::timestamptz,
  'Sexta 17h + 2h úteis = segunda 9h'
);

select is(
  app.adicionar_horas_uteis('2026-10-09 17:00-03', 2),
  '2026-10-13 09:00-03'::timestamptz,
  'Feriado (12/10) é pulado no prazo'
);

select is(
  app.adicionar_horas_uteis('2026-10-05 07:00-03', 3),
  '2026-10-05 11:00-03'::timestamptz,
  'Antes do expediente, o prazo começa às 8h'
);

select throws_ok(
  $$ update public.chamados set id = 999 $$,
  '428C9',
  null,
  'Número do chamado não pode ser alterado'
);

-- =============================================================================
-- Leitura (RLS)
-- =============================================================================
select is(
  pg_temp.contar_como('a0000001-0000-0000-0000-000000000001',
    format('select 1 from public.chamados where id = %s', (select id from fx where nome = 'chamado_a'))),
  1::bigint, 'Solicitante vê o próprio chamado');

select is(
  pg_temp.contar_como('a0000001-0000-0000-0000-000000000001',
    format('select 1 from public.chamados where id = %s', (select id from fx where nome = 'chamado_b'))),
  0::bigint, 'Solicitante NÃO vê o chamado de outra pessoa');

select is(
  pg_temp.contar_como('c0000003-0000-0000-0000-000000000003',
    format('select 1 from public.chamados where id in (%s, %s)',
      (select id from fx where nome = 'chamado_a'), (select id from fx where nome = 'chamado_b'))),
  2::bigint, 'TI vê todos os chamados');

select is(
  pg_temp.contar_como('a0000001-0000-0000-0000-000000000001',
    format('select 1 from public.mensagens where chamado_id = %s', (select id from fx where nome = 'chamado_a'))),
  1::bigint, 'Solicitante NÃO vê mensagem interna');

select is(
  pg_temp.contar_como('c0000003-0000-0000-0000-000000000003',
    format('select 1 from public.mensagens where chamado_id = %s', (select id from fx where nome = 'chamado_a'))),
  2::bigint, 'TI vê mensagens internas');

select is(
  pg_temp.contar_como('b0000002-0000-0000-0000-000000000002',
    format('select 1 from public.mensagens where chamado_id = %s', (select id from fx where nome = 'chamado_a'))),
  0::bigint, 'Outro solicitante NÃO vê mensagens do chamado');

select is(
  pg_temp.contar_como('a0000001-0000-0000-0000-000000000001',
    format('select 1 from public.historico where chamado_id = %s', (select id from fx where nome = 'chamado_a'))),
  1::bigint, 'Solicitante vê só o histórico público');

select is(
  pg_temp.contar_como('a0000001-0000-0000-0000-000000000001',
    $$ select 1 from public.profiles where id = 'b0000002-0000-0000-0000-000000000002' $$),
  0::bigint, 'Solicitante NÃO lê o perfil completo de outra pessoa');

select is(
  pg_temp.contar_como('a0000001-0000-0000-0000-000000000001',
    $$ select 1 from public.perfis_publicos where id = 'b0000002-0000-0000-0000-000000000002' $$),
  1::bigint, 'Solicitante vê nome de outros pela view perfis_publicos');

select is(
  pg_temp.contar_como('a0000001-0000-0000-0000-000000000001',
    $$ select 1 from public.transferencias $$),
  0::bigint, 'Solicitante não lê transferências');

select is(
  pg_temp.executar_como('anon', null, 'select * from public.chamados'),
  '42501', 'Usuário não logado não lê nada');

-- =============================================================================
-- Escrita direta bloqueada para usuários (só pela API)
-- =============================================================================
select is(
  pg_temp.executar_como('authenticated', 'a0000001-0000-0000-0000-000000000001',
    format($$ insert into public.chamados (titulo, categoria_id, solicitante_id)
              values ('Burlando a API', %s, 'a0000001-0000-0000-0000-000000000001') $$,
           (select id from public.categorias where nome = 'Outros'))),
  '42501', 'Solicitante NÃO cria chamado direto no banco');

select is(
  pg_temp.executar_como('authenticated', 'a0000001-0000-0000-0000-000000000001',
    format('update public.chamados set status = ''concluido'' where id = %s',
           (select id from fx where nome = 'chamado_a'))),
  '42501', 'Solicitante NÃO altera chamado direto no banco');

select is(
  pg_temp.executar_como('authenticated', 'a0000001-0000-0000-0000-000000000001',
    $$ update public.profiles set papel = 'ti' where id = 'a0000001-0000-0000-0000-000000000001' $$),
  '42501', 'Solicitante NÃO consegue se promover a TI');

select is(
  pg_temp.executar_como('authenticated', 'a0000001-0000-0000-0000-000000000001',
    $$ update public.profiles set telefone = '2199999-0000', departamento = 'Obras'
       where id = 'a0000001-0000-0000-0000-000000000001' $$),
  'ok', 'Solicitante edita o próprio telefone e departamento');

do $do$
begin
  perform pg_temp.executar_como('authenticated', 'a0000001-0000-0000-0000-000000000001',
    $$ update public.profiles set telefone = '0000' where id = 'b0000002-0000-0000-0000-000000000002' $$);
end
$do$;
select is(
  (select telefone from public.profiles where id = 'b0000002-0000-0000-0000-000000000002'),
  null, 'Solicitante NÃO edita o perfil de outra pessoa');

-- =============================================================================
-- Papel da API (central_api)
-- =============================================================================
select is(
  pg_temp.executar_como('central_api', 'c0000003-0000-0000-0000-000000000003',
    format($$ insert into public.historico (chamado_id, autor_id, acao) values (%s, 'c0000003-0000-0000-0000-000000000003', 'teste_api') $$,
           (select id from fx where nome = 'chamado_a'))),
  'ok', 'API grava histórico');

select is(
  pg_temp.executar_como('central_api', null, 'delete from public.historico'),
  '42501', 'API NÃO apaga histórico');

select is(
  pg_temp.executar_como('central_api', null, 'delete from public.chamados'),
  '42501', 'API NÃO apaga chamados');

-- =============================================================================
-- Travas de integridade (valem até para o dono do banco)
-- =============================================================================
select throws_ok(
  format($$ insert into public.mensagens (chamado_id, autor_id, conteudo, interna)
            values (%s, 'a0000001-0000-0000-0000-000000000001', 'oi', true) $$,
         (select id from fx where nome = 'chamado_a')),
  'CC005', null, 'Solicitante não escreve mensagem interna');

select throws_ok(
  format('delete from public.chamados where id = %s', (select id from fx where nome = 'chamado_a')),
  'CC003', null, 'Chamados nunca são excluídos');

select throws_ok(
  format('update public.chamados set status = ''em_andamento'' where id = %s', (select id from fx where nome = 'chamado_a')),
  '23514', null, 'Em andamento exige responsável');

select throws_ok(
  format('update public.chamados set status = ''cancelado'' where id = %s', (select id from fx where nome = 'chamado_b')),
  '23514', null, 'Cancelar exige motivo');

update public.chamados
   set status = 'cancelado', motivo_cancelamento = 'Aberto por engano'
 where id = (select id from fx where nome = 'chamado_b');

select throws_ok(
  format('update public.chamados set titulo = ''Novo título'' where id = %s', (select id from fx where nome = 'chamado_b')),
  'CC001', null, 'Chamado cancelado é somente leitura');

select throws_ok(
  'update public.historico set acao = ''adulterado''',
  'CC002', null, 'Histórico não pode ser alterado');

-- =============================================================================
-- Anexos no Storage
-- =============================================================================
insert into public.anexos (chamado_id, mensagem_id, path, nome, mime, tamanho, origem, enviado_por) values
  ((select id from fx where nome = 'chamado_a'), (select id from fx where nome = 'msg_publica'),
   format('chamados/%s/print-publico.png', (select id from fx where nome = 'chamado_a')),
   'print-publico.png', 'image/png', 1000, 'colado', 'a0000001-0000-0000-0000-000000000001'),
  ((select id from fx where nome = 'chamado_a'), (select id from fx where nome = 'msg_interna'),
   format('chamados/%s/print-interno.png', (select id from fx where nome = 'chamado_a')),
   'print-interno.png', 'image/png', 1000, 'upload', 'c0000003-0000-0000-0000-000000000003');

insert into storage.objects (bucket_id, name)
select 'anexos', path from public.anexos;

select is(
  pg_temp.contar_como('a0000001-0000-0000-0000-000000000001',
    $$ select 1 from storage.objects where bucket_id = 'anexos' $$),
  1::bigint, 'Solicitante baixa só o anexo público do próprio chamado');

select is(
  pg_temp.contar_como('b0000002-0000-0000-0000-000000000002',
    $$ select 1 from storage.objects where bucket_id = 'anexos' $$),
  0::bigint, 'Outro solicitante NÃO acessa os arquivos');

select * from finish();
rollback;
