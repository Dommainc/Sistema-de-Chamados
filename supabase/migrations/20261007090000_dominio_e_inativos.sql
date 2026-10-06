-- =============================================================================
-- 0018 — Só e-mails da DOMMA usam a Central; perfil inativo não lê mais nada
--
-- P-005 (decisão do dono, 2026-10-06): integração Microsoft só para o login, e só
-- quem tem e-mail @dommainc.com.br acessa. O login já é restrito ao tenant da DOMMA
-- (provider Azure); esta é a segunda barreira: convidados de outros domínios no
-- tenant (ex.: parceiro no Teams) nascem com o perfil INATIVO.
-- Desligamento: a TI bloqueia a conta no Microsoft (não entra mais) e, se quiser,
-- marca profiles.ativo = false (docs/go-live.md).
--
-- P-009: até aqui, o solicitante inativo ainda lia os próprios chamados, mensagens,
-- histórico e anexos direto pelo Supabase. Agora toda leitura de solicitante exige
-- perfil ativo (a TI já exigia, em app.eh_ti()).
-- =============================================================================

insert into public.configuracoes (chave, valor, descricao, publico) values
  ('dominios_permitidos', '["dommainc.com.br"]'::jsonb,
   'Domínios de e-mail que podem usar a Central. Outros domínios ganham perfil inativo no 1º login.',
   false)
on conflict (chave) do nothing;

-- E-mail é de um domínio permitido?
create or replace function app.email_permitido(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    position('@' in p_email) > 0
    and lower(split_part(p_email, '@', 2)) in (
      select lower(d)
      from jsonb_array_elements_text(
        coalesce(
          (select c.valor from public.configuracoes c where c.chave = 'dominios_permitidos'),
          '[]'::jsonb
        )
      ) as d
    ),
    false
  );
$$;

-- Perfil do 1º login: ativo só se o e-mail for de domínio permitido.
create or replace function app.criar_profile_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := coalesce(new.email, new.raw_user_meta_data ->> 'email');
begin
  insert into public.profiles (id, nome, email, ativo)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Colaborador'
    ),
    v_email,
    app.email_permitido(v_email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Usuário logado tem perfil ativo?
create or replace function app.eu_ativo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.ativo);
$$;

-- Usuário logado é o solicitante do chamado E está ativo? (usada nas policies de
-- mensagens, anexos, histórico e no Storage)
create or replace function app.eh_solicitante_do_chamado(p_chamado_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.chamados c
    join public.profiles p on p.id = c.solicitante_id
    where c.id = p_chamado_id and c.solicitante_id = auth.uid() and p.ativo
  );
$$;

drop policy chamados_leitura on public.chamados;
create policy chamados_leitura on public.chamados
  for select to authenticated
  using (
    (solicitante_id = (select auth.uid()) and (select app.eu_ativo()))
    or (select app.eh_ti())
  );

revoke execute on function app.email_permitido(text) from public;
revoke execute on function app.eu_ativo() from public;
grant execute on function app.eu_ativo() to authenticated, central_api;
