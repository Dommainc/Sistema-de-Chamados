-- =============================================================================
-- 0033 — "O problema voltou" (dono, 2026-10-18)
--
-- Continua não havendo reabertura (CLAUDE.md): o solicitante abre um chamado NOVO a partir de um concluído,
-- e o novo guarda de qual ele é continuação. A TI vê "Continuação do #41" e o histórico do anterior.
-- Regra (banco + API): o anterior é do mesmo solicitante e está concluído. Não muda depois de criado.
-- =============================================================================

alter table public.chamados
  add column continuacao_de bigint references public.chamados (id);

comment on column public.chamados.continuacao_de is
  'Chamado concluído que voltou a dar problema (botão "O problema voltou"). Mesmo solicitante; não muda.';

create index chamados_continuacao_idx on public.chamados (continuacao_de) where continuacao_de is not null;

create or replace function app.chamados_continuacao_valida()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.continuacao_de is distinct from old.continuacao_de then
      raise exception using errcode = 'CC002', message = 'Continuação de chamado não pode mudar';
    end if;
    return new;
  end if;
  if new.continuacao_de is not null and not exists (
    select 1 from public.chamados a
     where a.id = new.continuacao_de
       and a.solicitante_id = new.solicitante_id
       and a.status = 'concluido'
  ) then
    raise exception using errcode = 'CC006',
      message = 'Continuação só de um chamado concluído do mesmo solicitante';
  end if;
  return new;
end;
$$;

create trigger chamados_continuacao_valida
  before insert or update of continuacao_de on public.chamados
  for each row execute function app.chamados_continuacao_valida();
