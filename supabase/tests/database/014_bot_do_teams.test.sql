-- =============================================================================
-- Testes: migration 0027 — bot do Teams (conversas por e-mail e disparo pelo banco).
-- Rodar com:  supabase test db
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.teams_conversas'::regclass),
  'RLS continua ligado em teams_conversas'
);

-- Quem instalou o bot antes do 1º login: guardado só com o e-mail.
select lives_ok(
  $$ insert into public.teams_conversas (teams_user_id, email, conversation_id, service_url)
     values ('29:sem-perfil', 'nova.pessoa@dommainc.com.br', 'a:1', 'https://smba.trafficmanager.net/br/') $$,
  'Conversa sem perfil (ainda não entrou na Central) é aceita'
);

select throws_ok(
  $$ insert into public.teams_conversas (teams_user_id, email, conversation_id, service_url)
     values ('29:maiuscula', 'Fulano@DommaInc.com.br', 'a:2', 'https://smba.trafficmanager.net/br/') $$,
  '23514', null, 'E-mail guardado sempre em minúsculo'
);

select throws_ok(
  $$ insert into public.teams_conversas (teams_user_id, email, conversation_id, service_url)
     values ('29:sem-perfil', 'outra@dommainc.com.br', 'a:3', 'https://smba.trafficmanager.net/br/') $$,
  '23505', null, 'Uma conversa por pessoa do Teams'
);

-- Navegador não lê as conversas do bot (só a TI, policy antiga) nem grava.
insert into auth.users (id, email, raw_user_meta_data) values
  ('de000001-0000-0000-0000-000000000001', 'sol.bot@dommainc.com.br', '{"full_name":"Sol Bot"}');
select set_config('request.jwt.claims', '{"sub":"de000001-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.teams_conversas), 0, 'Solicitante não vê conversas do bot');
reset role;

-- Sem o Vault configurado, o disparo não faz nada (os avisos esperam como pendente).
select is(app.disparar_envio_teams(), false, 'Sem endereço/segredo no Vault, não chama a API');

select is(
  (select count(*)::int from cron.job where jobname = 'enviar-avisos-teams'),
  1, 'Agendamento do envio a cada minuto'
);

select * from finish();
rollback;
