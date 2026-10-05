-- =============================================================================
-- 0005 — Chamados
-- ID: 1, 2, 3... gerado pelo banco, imutável, nunca reaproveitado.
-- A máquina de estados (transições permitidas) vive na FastAPI
-- (apps/api/app/dominio/estados.py). Aqui ficam só as travas que o banco
-- garante sozinho, mesmo se alguém contornar a API.
--
-- Códigos de erro próprios (SQLSTATE) mapeados pela FastAPI:
--   CC001 chamado encerrado (fechado/cancelado) é somente leitura
--   CC002 tentativa de alterar campo imutável
--   CC003 chamados não podem ser excluídos
--   CC004 categoria inativa ou inexistente
--   CC005 autor sem permissão (ex.: mensagem interna de solicitante)
--   CC006 inconsistência entre registros (ex.: anexo de outro chamado)
-- =============================================================================

create table public.chamados (
  id                  bigint generated always as identity (start with 1 increment by 1) primary key,
  titulo              text not null check (length(trim(titulo)) between 3 and 200),
  categoria_id        bigint not null references public.categorias (id),
  area_id             bigint not null references public.areas (id),
  solicitante_id      uuid not null references public.profiles (id),
  responsavel_id      uuid references public.profiles (id),
  status              public.status_chamado not null default 'aberto',
  prioridade          public.prioridade not null default 'media',
  respostas_form      jsonb not null default '{}'::jsonb check (jsonb_typeof(respostas_form) = 'object'),
  prazo_sla           timestamptz,
  sla_pausado_em      timestamptz,                          -- Fase 2
  sla_pausado_total   interval not null default '0 seconds', -- Fase 2
  motivo_cancelamento text,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now(),
  resolvido_em        timestamptz,
  fechado_em          timestamptz,
  cancelado_em        timestamptz,

  constraint chamados_atendimento_exige_responsavel
    check (status <> 'em_atendimento' or responsavel_id is not null),
  constraint chamados_cancelado_exige_motivo
    check (status <> 'cancelado'
           or (motivo_cancelamento is not null and length(trim(motivo_cancelamento)) >= 3)),
  constraint chamados_resolvido_tem_data
    check (status not in ('resolvido', 'fechado') or resolvido_em is not null),
  constraint chamados_fechado_tem_data
    check (status <> 'fechado' or fechado_em is not null)
);
comment on column public.chamados.id is
  'Número do chamado exibido ao usuário (#42). Gerado pelo banco; nunca reaproveitado.';
comment on column public.chamados.respostas_form is
  'Respostas do formulário dinâmico, indexadas por campos_form.chave.';

-- -----------------------------------------------------------------------------
-- Antes de inserir: valida categoria, herda área e calcula o prazo
-- -----------------------------------------------------------------------------
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

  if new.status <> 'aberto' then
    raise exception using errcode = 'CC002', message = 'Todo chamado nasce com status aberto';
  end if;

  new.criado_em     := coalesce(new.criado_em, now());
  new.atualizado_em := new.criado_em;
  new.area_id       := v_categoria.area_id;
  new.prazo_sla     := app.adicionar_horas_uteis(new.criado_em, v_categoria.sla_horas);
  return new;
end;
$$;

create trigger chamados_antes_inserir
  before insert on public.chamados
  for each row execute function app.chamados_antes_inserir();

-- -----------------------------------------------------------------------------
-- Antes de atualizar: encerrado é somente leitura, campos imutáveis e
-- carimbos de data de cada status.
-- -----------------------------------------------------------------------------
create or replace function app.chamados_antes_atualizar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status in ('fechado', 'cancelado') then
    raise exception using errcode = 'CC001',
      message = format('Chamado %s está %s e não pode ser alterado', old.id, old.status);
  end if;

  if new.solicitante_id <> old.solicitante_id or new.criado_em <> old.criado_em then
    raise exception using errcode = 'CC002', message = 'Solicitante e data de abertura não podem mudar';
  end if;

  if new.status is distinct from old.status then
    case new.status
      when 'resolvido' then
        new.resolvido_em := coalesce(new.resolvido_em, now());
      when 'fechado' then
        new.fechado_em := coalesce(new.fechado_em, now());
      when 'cancelado' then
        new.cancelado_em := coalesce(new.cancelado_em, now());
      else
        -- Reabertura (resolvido -> em_atendimento) limpa a data de resolução
        if old.status = 'resolvido' then
          new.resolvido_em := null;
        end if;
    end case;
  end if;

  new.atualizado_em := now();
  return new;
end;
$$;

create trigger chamados_antes_atualizar
  before update on public.chamados
  for each row execute function app.chamados_antes_atualizar();

-- -----------------------------------------------------------------------------
-- Chamados nunca são excluídos (cancelados mantêm o número).
-- -----------------------------------------------------------------------------
create or replace function app.bloquear_exclusao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = 'CC003',
    message = format('Registros de %s não podem ser excluídos', tg_table_name);
end;
$$;

create trigger chamados_bloquear_exclusao
  before delete on public.chamados
  for each row execute function app.bloquear_exclusao();
