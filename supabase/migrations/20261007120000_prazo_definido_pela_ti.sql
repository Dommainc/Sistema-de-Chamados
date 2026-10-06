-- =============================================================================
-- 0019 — Prazo definido pela TI (decisão do dono, 2026-10-07 — docs/adr/0009)
--
-- O chamado nasce SEM prazo. Não há mais cálculo automático pela categoria
-- (categorias.sla_horas deixa de ser usado; fica para a Fase 2). Um técnico define
-- o prazo (data e hora) quando quiser, pela API (POST /chamados/{id}/prazo), e pode
-- alterá-lo com motivo. Cada definição grava historico.acao = 'prazo_definido'
-- (detalhe: prazo, prazo_anterior, motivo) e avisa o solicitante
-- (notificacoes.tipo = 'prazo_definido'), na mesma transação.
-- A coluna mantém o nome prazo_sla para não espalhar mudança.
-- =============================================================================

create or replace function app.chamados_antes_inserir()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_categoria public.categorias%rowtype;
begin
  select * into v_categoria
  from public.categorias
  where id = new.categoria_id and ativo;

  if not found then
    raise exception using errcode = 'CC004', message = 'Categoria inativa ou inexistente';
  end if;

  if new.status <> 'pendente' then
    raise exception using errcode = 'CC002', message = 'Todo chamado nasce com status pendente';
  end if;

  new.criado_em     := coalesce(new.criado_em, now());
  new.atualizado_em := new.criado_em;
  new.area_id       := v_categoria.area_id;
  new.prazo_sla     := null;  -- quem define é a TI, depois
  return new;
end;
$$;

comment on column public.chamados.prazo_sla is
  'Prazo para concluir, definido por um técnico (nulo = ainda sem prazo). Ver docs/adr/0009.';
comment on column public.categorias.sla_horas is
  'Sem uso desde a migration 0019 (prazo definido pela TI). Reservado para a Fase 2.';
