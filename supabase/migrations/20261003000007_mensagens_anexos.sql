-- =============================================================================
-- 0007 — Mensagens do chat e anexos
-- =============================================================================

create table public.mensagens (
  id         bigint generated always as identity primary key,
  chamado_id bigint not null references public.chamados (id),
  autor_id   uuid not null references public.profiles (id),
  conteudo   text not null default '' check (length(conteudo) <= 10000),
  interna    boolean not null default false,  -- true = visível só para a TI
  origem     public.origem_mensagem not null default 'web',
  criado_em  timestamptz not null default now()
);
comment on column public.mensagens.conteudo is
  'Pode ser vazio quando a mensagem só tem anexos (a API valida que há texto ou anexo).';

create or replace function app.mensagens_antes_inserir()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.status_chamado;
begin
  select status into v_status from public.chamados where id = new.chamado_id;

  if v_status in ('fechado', 'cancelado') then
    raise exception using errcode = 'CC001',
      message = format('Chamado %s está %s e não aceita mensagens', new.chamado_id, v_status);
  end if;

  if new.interna and not exists (
    select 1 from public.profiles p where p.id = new.autor_id and p.papel = 'ti' and p.ativo
  ) then
    raise exception using errcode = 'CC005', message = 'Somente a TI pode escrever mensagens internas';
  end if;

  new.criado_em := coalesce(new.criado_em, now());
  return new;
end;
$$;

create trigger mensagens_antes_inserir
  before insert on public.mensagens
  for each row execute function app.mensagens_antes_inserir();

create trigger mensagens_somente_insercao
  before update or delete on public.mensagens
  for each row execute function app.bloquear_alteracao();

-- -----------------------------------------------------------------------------
-- Anexos. Arquivo no bucket privado "anexos", em chamados/{chamado_id}/...
-- -----------------------------------------------------------------------------
create table public.anexos (
  id          uuid primary key default gen_random_uuid(),
  chamado_id  bigint not null references public.chamados (id),
  mensagem_id bigint references public.mensagens (id),  -- nulo = anexado na abertura
  path        text not null unique,
  nome        text not null check (length(trim(nome)) between 1 and 255),
  mime        text not null,
  tamanho     bigint not null check (tamanho > 0),
  origem      public.origem_anexo not null default 'upload',
  enviado_por uuid not null references public.profiles (id),
  criado_em   timestamptz not null default now(),
  constraint anexos_path_do_chamado check (path like 'chamados/' || chamado_id::text || '/%')
);

create or replace function app.anexos_antes_inserir()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.mensagem_id is not null and not exists (
    select 1 from public.mensagens m where m.id = new.mensagem_id and m.chamado_id = new.chamado_id
  ) then
    raise exception using errcode = 'CC006', message = 'A mensagem do anexo pertence a outro chamado';
  end if;
  return new;
end;
$$;

create trigger anexos_antes_inserir
  before insert on public.anexos
  for each row execute function app.anexos_antes_inserir();

create trigger anexos_somente_insercao
  before update or delete on public.anexos
  for each row execute function app.bloquear_alteracao();
