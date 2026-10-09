-- =============================================================================
-- 0024 — Pesquisa de satisfação (pedido do dono, 2026-10-09 — docs/adr/0015)
--
-- Depois de CONCLUÍDO, o solicitante avalia o atendimento uma vez: 1 a 5 estrelas + texto
-- (obrigatório quando a nota é 1 ou 2). Sem prazo para avaliar. A avaliação não muda nem é apagada.
-- Leitura: o solicitante vê a própria; a TI vê todas (com o nome de quem avaliou — decisão do dono).
-- Escrita: só a FastAPI (central_api), como todas as tabelas de negócio (docs/adr/0002).
-- =============================================================================

create table public.avaliacoes (
  chamado_id   bigint primary key references public.chamados (id),
  avaliador_id uuid not null references public.profiles (id),
  nota         smallint not null check (nota between 1 and 5),
  comentario   text check (comentario is null or length(comentario) <= 2000),
  criado_em    timestamptz not null default now(),
  constraint avaliacoes_comentario_nota_baixa check (
    nota > 2 or length(trim(coalesce(comentario, ''))) >= 3
  )
);
comment on table public.avaliacoes is
  'Pesquisa de satisfação: uma por chamado concluído, feita pelo solicitante. Não muda nem é apagada.';

-- Só o solicitante, só chamado concluído (e a PK garante uma vez só).
create or replace function app.avaliacoes_antes_inserir()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chamado public.chamados%rowtype;
begin
  select * into v_chamado from public.chamados where id = new.chamado_id;
  if v_chamado.status is distinct from 'concluido' then
    raise exception using errcode = 'CC006',
      message = 'Só dá para avaliar chamado concluído';
  end if;
  if v_chamado.solicitante_id is distinct from new.avaliador_id then
    raise exception using errcode = 'CC005',
      message = 'Só o solicitante avalia o próprio chamado';
  end if;
  new.criado_em := now();
  return new;
end;
$$;

create trigger avaliacoes_antes_inserir
  before insert on public.avaliacoes
  for each row execute function app.avaliacoes_antes_inserir();

create trigger avaliacoes_somente_insercao
  before update or delete on public.avaliacoes
  for each row execute function app.bloquear_alteracao();

alter table public.avaliacoes enable row level security;

grant select on public.avaliacoes to authenticated;
grant select, insert on public.avaliacoes to central_api;

create policy avaliacoes_leitura on public.avaliacoes
  for select to authenticated
  using (avaliador_id = (select auth.uid()) or (select app.eh_ti()));

create policy api_avaliacoes on public.avaliacoes
  for all to central_api
  using (true) with check (true);

create index avaliacoes_criado_em_idx on public.avaliacoes (criado_em desc);
