-- =============================================================================
-- Testes: migration 0028 — lembrete de 12 h, conclusão automática em 48 h úteis e expediente
-- (ADR 0019). Datas fixas; expediente do seed (seg–sex, 8h–20h).
-- Rodar com:  supabase test db
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

-- ----------------------------------------------------------------------------- expediente
select ok(app.eh_horario_util('2026-10-05 10:00-03'), 'Segunda 10h: expediente');
select ok(app.eh_horario_util('2026-10-05 08:00-03'), 'Segunda 8h em ponto: expediente');
select ok(not app.eh_horario_util('2026-10-05 20:00-03'), 'Segunda 20h: fora do expediente');
select ok(not app.eh_horario_util('2026-10-03 10:00-03'), 'Sábado: fora do expediente');
select ok(not app.eh_horario_util('2026-10-12 10:00-03'), 'Feriado (12/10): fora do expediente');

-- Quando a TI volta (aviso de quem abre fora do expediente)
select is(app.proxima_abertura('2026-10-05 10:00-03'), '2026-10-05 10:00-03'::timestamptz, 'No expediente: agora mesmo');
select is(app.proxima_abertura('2026-10-05 06:30-03'), '2026-10-05 08:00-03'::timestamptz, 'Madrugada de dia útil: hoje às 8h');
select is(app.proxima_abertura('2026-10-09 21:00-03'), '2026-10-13 08:00-03'::timestamptz, 'Sexta à noite antes do feriado: terça às 8h');

-- ----------------------------------------------------------------------------- dados
insert into auth.users (id, email, raw_user_meta_data) values
  ('d1400001-0000-0000-0000-000000000001', 'ana.avisos@dommainc.com.br', '{"full_name":"Ana Avisos"}'),
  ('d1400003-0000-0000-0000-000000000003', 'ti.avisos@dommainc.com.br',  '{"full_name":"TI Avisos"}');
update public.profiles set papel = 'ti' where id = 'd1400003-0000-0000-0000-000000000003';

create temp table fx (nome text primary key, id bigint);
with c as (
  insert into public.chamados (titulo, categoria_id, solicitante_id)
  select v.titulo, (select id from public.categorias where nome = 'Outros'),
         'd1400001-0000-0000-0000-000000000001'
  from (values ('treze horas'), ('dias sem resposta'), ('respondeu'), ('passou das 24')) v(titulo)
  returning id, titulo
) insert into fx select titulo, id from c;

update public.chamados
   set status = 'em_andamento', responsavel_id = 'd1400003-0000-0000-0000-000000000003'
 where id in (select id from fx);

insert into public.historico (chamado_id, autor_id, acao, de, para, criado_em)
select id, 'd1400003-0000-0000-0000-000000000003', 'assumido', 'pendente', 'em_andamento', '2026-09-28 08:30-03'
from fx;

insert into public.mensagens (chamado_id, autor_id, conteudo, criado_em) values
  -- quinta 09:00 → sexta 10:00 = 13 h úteis
  ((select id from fx where nome = 'treze horas'),       'd1400003-0000-0000-0000-000000000003', 'Testa?', '2026-10-01 09:00-03'),
  -- segunda 28/09 → segunda 05/10: bem mais de 48 h úteis
  ((select id from fx where nome = 'dias sem resposta'), 'd1400003-0000-0000-0000-000000000003', 'Testa?', '2026-09-28 09:00-03'),
  ((select id from fx where nome = 'respondeu'),         'd1400003-0000-0000-0000-000000000003', 'Testa?', '2026-09-28 09:00-03'),
  ((select id from fx where nome = 'respondeu'),         'd1400001-0000-0000-0000-000000000001', 'Testei',  '2026-09-28 10:00-03'),
  ((select id from fx where nome = 'passou das 24'),     'd1400003-0000-0000-0000-000000000003', 'Testa?', '2026-10-01 09:00-03');

create temp view avisos as
select f.nome, n.tipo, n.payload
from public.notificacoes n join fx f on f.id = n.chamado_id;

-- ----------------------------------------------------------------------------- 12 h
select app.processar_inatividade('2026-10-02 10:00-03');

select is(
  (select status::text from public.chamados where id = (select id from fx where nome = 'treze horas')),
  'aguardando_usuario', '13 h úteis: foi para Aguardando usuário'
);
select is(
  (select count(*) from avisos where nome = 'treze horas' and tipo = 'lembrete_resposta'),
  1::bigint, '12 h úteis: um lembrete'
);
select is(
  (select count(*) from avisos where nome = 'treze horas' and tipo = 'status_alterado'),
  0::bigint, 'Job atrasado: só o maior aviso vencido (sem o de 2 h junto)'
);

select app.processar_inatividade('2026-10-02 10:05-03');
select is(
  (select count(*) from avisos where nome = 'treze horas' and tipo = 'lembrete_resposta'),
  1::bigint, 'O lembrete de 12 h não se repete'
);

-- Nova mensagem da TI: a contagem recomeça (sexta 11h → segunda 11h = 12 h úteis).
insert into public.mensagens (chamado_id, autor_id, conteudo, criado_em) values
  ((select id from fx where nome = 'treze horas'), 'd1400003-0000-0000-0000-000000000003', 'E agora?', '2026-10-02 11:00-03');
select app.processar_inatividade('2026-10-05 09:00-03');
select is(
  (select count(*) from avisos where nome = 'treze horas' and tipo = 'lembrete_resposta'),
  1::bigint, 'Nova contagem: 10 h úteis ainda não lembra'
);
select app.processar_inatividade('2026-10-05 11:00-03');
select is(
  (select count(*) from avisos where nome = 'treze horas' and tipo = 'lembrete_resposta'),
  2::bigint, 'Nova contagem: 12 h úteis lembra de novo'
);

-- ----------------------------------------------------------------------------- 48 h
select is(
  (select status::text from public.chamados where id = (select id from fx where nome = 'dias sem resposta')),
  'concluido', '48 h úteis sem resposta: concluído automaticamente'
);
select ok(
  (select concluido_em is not null from public.chamados where id = (select id from fx where nome = 'dias sem resposta')),
  'Concluído tem data'
);
select is(
  (select detalhe ->> 'motivo' from public.historico
    where chamado_id = (select id from fx where nome = 'dias sem resposta') and acao = 'concluido' and autor_id is null),
  'sem_resposta_48h_uteis', 'Histórico sem autor (Sistema) com o motivo'
);
select is(
  (select array_agg(tipo || ':' || coalesce(payload ->> 'motivo', '') order by tipo) from avisos where nome = 'dias sem resposta'),
  array['status_alterado:sem_resposta_48h_uteis'], 'Só o aviso das 48 h (nem 2 h, 12 h, 24 h, nem o "concluído" comum)'
);
select is(
  (select count(*) from public.mensagens
    where chamado_id = (select id from fx where nome = 'dias sem resposta') and origem::text = 'sistema'),
  0::bigint, 'Concluído antes: sem mensagem automática das 24 h'
);

select is(
  (select status::text from public.chamados where id = (select id from fx where nome = 'respondeu')),
  'em_andamento', 'Solicitante respondeu: nada acontece'
);

-- A mensagem automática das 24 h não zera a contagem das 48 h.
select is(
  (select count(*) from public.mensagens
    where chamado_id = (select id from fx where nome = 'passou das 24') and origem::text = 'sistema'),
  1::bigint, '24 h úteis: mensagem automática no chat'
);
select app.processar_inatividade('2026-10-08 10:00-03');
select is(
  (select status::text from public.chamados where id = (select id from fx where nome = 'passou das 24')),
  'concluido', 'Depois do aviso das 24 h, as 48 h concluem'
);

select * from finish();
rollback;
