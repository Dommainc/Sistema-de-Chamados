-- =============================================================================
-- Testes: migration 0021 — automações por tempo (2 h úteis → aguardando; 24 h úteis → aviso).
-- Datas fixas (migration 0028): "agora" = segunda 05/10/2026 10:00; a TI falou na quinta 01/10 às 09:00
-- (25 h úteis: passa de 2 h e de 24 h, mas não das 48 h da conclusão automática — teste 015).
-- Rodar com:  supabase test db
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('d8000001-0000-0000-0000-000000000001', 'ana.inat@dommainc.com.br', '{"full_name":"Ana Inativa"}'),
  ('d8000003-0000-0000-0000-000000000003', 'ti.inat@dommainc.com.br',  '{"full_name":"TI Inat"}');
update public.profiles set papel = 'ti' where id = 'd8000003-0000-0000-0000-000000000003';

create temp table fx (nome text primary key, id bigint);
with c as (
  insert into public.chamados (titulo, categoria_id, solicitante_id)
  select v.titulo, (select id from public.categorias where nome = 'Outros'),
         'd8000001-0000-0000-0000-000000000001'
  from (values ('TI falou ha dias'), ('TI falou agora'), ('Solicitante falou por ultimo')) v(titulo)
  returning id, titulo
) insert into fx select titulo, id from c;

update public.chamados
   set status = 'em_andamento', responsavel_id = 'd8000003-0000-0000-0000-000000000003'
 where id in (select id from fx);

-- Mensagens: a da TI de quinta (passa de 2 h e de 24 h úteis), uma de agora, e uma conversa
-- em que o solicitante respondeu por último.
insert into public.mensagens (chamado_id, autor_id, conteudo, criado_em) values
  ((select id from fx where nome = 'TI falou ha dias'), 'd8000003-0000-0000-0000-000000000003', 'Consegue testar?', '2026-10-01 09:00-03'),
  ((select id from fx where nome = 'TI falou agora'),   'd8000003-0000-0000-0000-000000000003', 'Consegue testar?', '2026-10-05 09:59-03'),
  ((select id from fx where nome = 'Solicitante falou por ultimo'), 'd8000003-0000-0000-0000-000000000003', 'Pergunta', '2026-10-01 09:00-03'),
  ((select id from fx where nome = 'Solicitante falou por ultimo'), 'd8000001-0000-0000-0000-000000000001', 'Resposta', '2026-10-01 10:00-03');
-- Entrou em atendimento na quinta cedo (histórico do "iniciar").
insert into public.historico (chamado_id, autor_id, acao, de, para, criado_em)
select id, 'd8000003-0000-0000-0000-000000000003', 'assumido', 'pendente', 'em_andamento', '2026-10-01 08:30-03'
from fx;

select ok(app.processar_inatividade('2026-10-05 10:00-03') >= 2, 'Processa: muda o status e manda o aviso');

select is(
  (select status::text from public.chamados where id = (select id from fx where nome = 'TI falou ha dias')),
  'aguardando_usuario', '2 h úteis sem resposta à TI → Aguardando usuário'
);
select is(
  (select autor_id from public.historico
    where chamado_id = (select id from fx where nome = 'TI falou ha dias') and para = 'aguardando_usuario'),
  null, 'A mudança automática fica no histórico sem autor (Sistema)'
);
select is(
  (select count(*) from public.mensagens
    where chamado_id = (select id from fx where nome = 'TI falou ha dias') and origem::text = 'sistema'),
  1::bigint, '24 h úteis sem resposta → uma mensagem automática no chat'
);
select ok(
  (select conteudo like 'Olá, Ana! Estamos aguardando sua resposta%' from public.mensagens
    where chamado_id = (select id from fx where nome = 'TI falou ha dias') and origem::text = 'sistema'),
  'Aviso chama o solicitante pelo primeiro nome'
);
select is(
  (select count(*) from public.notificacoes
    where chamado_id = (select id from fx where nome = 'TI falou ha dias') and tipo = 'aviso_inatividade'),
  1::bigint, 'O solicitante recebe o aviso (outbox)'
);

-- Rodar de novo não repete o aviso nem o histórico.
select app.processar_inatividade('2026-10-05 10:05-03');
select is(
  (select count(*) from public.mensagens
    where chamado_id = (select id from fx where nome = 'TI falou ha dias') and origem::text = 'sistema'),
  1::bigint, 'O aviso não se repete'
);

select is(
  (select status::text from public.chamados where id = (select id from fx where nome = 'TI falou agora')),
  'em_andamento', 'Mensagem da TI recente: nada muda'
);
select is(
  (select status::text from public.chamados where id = (select id from fx where nome = 'Solicitante falou por ultimo')),
  'em_andamento', 'Solicitante respondeu por último: nada muda'
);

select * from finish();
rollback;
