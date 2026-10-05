-- =============================================================================
-- 0004 — Perfis
-- papel: 'solicitante' (padrão) ou 'ti'. Definido a cada login pela FastAPI a
-- partir do grupo do Entra ID (docs/adr/0004). O usuário só edita departamento
-- e telefone (ver grants na 0010).
-- =============================================================================

create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  nome            text not null,
  email           text,
  departamento    text check (departamento is null or length(trim(departamento)) between 2 and 100),
  telefone        text check (telefone is null or length(trim(telefone)) between 3 and 30),
  papel           public.papel not null default 'solicitante',
  area_id         bigint references public.areas (id),
  teams_user_id   text unique,
  ativo           boolean not null default true,
  ultimo_login_em timestamptz,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);
comment on column public.profiles.departamento is
  'Pedido uma única vez no primeiro acesso (nulo = cadastro inicial pendente).';

create unique index profiles_email_unico on public.profiles (lower(email)) where email is not null;

create trigger profiles_atualizado_em
  before update on public.profiles
  for each row execute function app.definir_atualizado_em();

-- Cria o perfil quando o Supabase Auth registra o usuário no 1º login.
create or replace function app.criar_profile_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nome, email)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Colaborador'
    ),
    coalesce(new.email, new.raw_user_meta_data ->> 'email')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function app.criar_profile_novo_usuario();

-- O Supabase Auth dispara o trigger como supabase_auth_admin.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant usage on schema app to supabase_auth_admin;
  end if;
end
$$;
