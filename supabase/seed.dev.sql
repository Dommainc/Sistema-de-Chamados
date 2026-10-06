-- =============================================================================
-- Seed de DESENVOLVIMENTO — só para o ambiente local (supabase/config.toml).
-- NUNCA rodar em dev/prod na nuvem.
--
-- 4 usuários de teste com login por e-mail/senha (senha: teste123), os mesmos do
-- modo simulado do front (ADR 0006):
--   ana@teste.local     Ana Souza       solicitante, SEM departamento (testa o primeiro acesso)
--   bruno@teste.local   Bruno Teixeira  solicitante
--   tec@teste.local     Rafael Lima     TI
--   thiago@teste.local  Thiago Martins  TI
-- =============================================================================

with usuarios(id, email, nome) as (
  values
    ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'ana@teste.local',    'Ana Souza'),
    ('bbbbbbbb-0000-0000-0000-000000000002'::uuid, 'bruno@teste.local',  'Bruno Teixeira'),
    ('cccccccc-0000-0000-0000-000000000003'::uuid, 'tec@teste.local',    'Rafael Lima'),
    ('dddddddd-0000-0000-0000-000000000004'::uuid, 'thiago@teste.local', 'Thiago Martins')
)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('teste123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', u.nome), now(), now(),
  '', '', '', ''
from usuarios u
on conflict (id) do nothing;

-- Identidade de e-mail (exigida pelo Supabase Auth para o login por senha).
insert into auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       now(), now(), now()
from auth.users u
where u.email like '%@teste.local'
on conflict do nothing;

-- O perfil é criado pelo trigger ao inserir em auth.users; aqui só papel e cadastro.
update public.profiles set papel = 'ti', departamento = 'TI', telefone = '(21) 99999-0003'
 where id = 'cccccccc-0000-0000-0000-000000000003';
update public.profiles set papel = 'ti', departamento = 'TI', telefone = '(21) 99999-0004'
 where id = 'dddddddd-0000-0000-0000-000000000004';
update public.profiles set departamento = 'Financeiro', telefone = '(21) 99999-0002'
 where id = 'bbbbbbbb-0000-0000-0000-000000000002';

-- Senha LOCAL do papel da API (na nuvem é definida à mão — docs/runbooks/rotacionar-chave.md).
-- DATABASE_URL local: postgresql://central_api:central_api_local@127.0.0.1:54322/postgres
alter role central_api with login password 'central_api_local';
