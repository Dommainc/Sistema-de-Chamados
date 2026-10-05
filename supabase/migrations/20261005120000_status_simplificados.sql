-- =============================================================================
-- 0015 — Status simplificados (docs/adr/0005)
-- 8 status -> 6: pendente, em_andamento, aguardando_usuario, transferido,
-- concluido, cancelado. Sem confirmação, reabertura nem fechamento automático.
--
-- Mapeamento dos dados existentes:
--   aberto, em_analise   -> pendente (responsável é limpo)
--   em_atendimento       -> em_andamento
--   resolvido, fechado   -> concluido (concluido_em = fechado_em ou resolvido_em)
--
-- Também resolve a P-011: funções criadas daqui para frente nascem sem
-- EXECUTE para PUBLIC (precisam de GRANT explícito).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Fechamento automático deixa de existir
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    execute $q$
      select cron.unschedule(jobid) from cron.job where jobname = 'fechar-chamados-resolvidos'
    $q$;
  end if;
end
$$;

drop function if exists app.fechar_resolvidos_expirados();

delete from public.configuracoes where chave = 'dias_fechamento_automatico';

-- -----------------------------------------------------------------------------
-- 2. Remove o que depende dos valores antigos do enum
-- -----------------------------------------------------------------------------
alter table public.chamados
  drop constraint chamados_atendimento_exige_responsavel,
  drop constraint chamados_cancelado_exige_motivo,
  drop constraint chamados_resolvido_tem_data,
  drop constraint chamados_fechado_tem_data,
  alter column status drop default;

drop index public.chamados_prazo_abertos_idx;
drop index public.chamados_resolvidos_idx;

-- -----------------------------------------------------------------------------
-- 3. Troca o enum
-- -----------------------------------------------------------------------------
alter type public.status_chamado rename to status_chamado_antigo;

create type public.status_chamado as enum (
  'pendente',
  'em_andamento',
  'aguardando_usuario',
  'transferido',
  'concluido',
  'cancelado'
);

alter table public.chamados
  alter column status type public.status_chamado using (
    case status::text
      when 'aberto'         then 'pendente'
      when 'em_analise'     then 'pendente'
      when 'em_atendimento' then 'em_andamento'
      when 'resolvido'      then 'concluido'
      when 'fechado'        then 'concluido'
      else status::text
    end
  )::public.status_chamado,
  alter column status set default 'pendente';

drop type public.status_chamado_antigo;

-- -----------------------------------------------------------------------------
-- 4. concluido_em substitui resolvido_em e fechado_em
-- O trigger de "encerrado é somente leitura" fica desligado só durante a cópia.
-- -----------------------------------------------------------------------------
alter table public.chamados add column concluido_em timestamptz;

alter table public.chamados disable trigger chamados_antes_atualizar;

update public.chamados
   set concluido_em = coalesce(fechado_em, resolvido_em, atualizado_em)
 where status = 'concluido';

update public.chamados
   set responsavel_id = null
 where status = 'pendente' and responsavel_id is not null;

alter table public.chamados enable trigger chamados_antes_atualizar;

alter table public.chamados
  drop column resolvido_em,
  drop column fechado_em;

-- -----------------------------------------------------------------------------
-- 5. Regras de consistência (nomes usados pelo catálogo de erros, SQLSTATE 23514)
-- -----------------------------------------------------------------------------
alter table public.chamados
  add constraint chamados_pendente_sem_responsavel
    check (status <> 'pendente' or responsavel_id is null),
  add constraint chamados_atendimento_exige_responsavel
    check (status not in ('em_andamento', 'aguardando_usuario', 'transferido')
           or responsavel_id is not null),
  add constraint chamados_concluido_tem_data
    check (status <> 'concluido' or concluido_em is not null),
  add constraint chamados_cancelado_exige_motivo
    check (status <> 'cancelado'
           or (motivo_cancelamento is not null and length(trim(motivo_cancelamento)) >= 3));

comment on column public.chamados.concluido_em is
  'Quando o técnico concluiu. Concluído é final: não há reabertura (docs/adr/0005).';

-- -----------------------------------------------------------------------------
-- 6. Triggers que citam status
-- (create or replace mantém os privilégios já definidos na 0009)
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

  if new.status <> 'pendente' then
    raise exception using errcode = 'CC002', message = 'Todo chamado nasce com status pendente';
  end if;

  new.criado_em     := coalesce(new.criado_em, now());
  new.atualizado_em := new.criado_em;
  new.area_id       := v_categoria.area_id;
  new.prazo_sla     := app.adicionar_horas_uteis(new.criado_em, v_categoria.sla_horas);
  return new;
end;
$$;

create or replace function app.chamados_antes_atualizar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status in ('concluido', 'cancelado') then
    raise exception using errcode = 'CC001',
      message = format('Chamado %s está %s e não pode ser alterado', old.id, old.status);
  end if;

  if new.solicitante_id <> old.solicitante_id or new.criado_em <> old.criado_em then
    raise exception using errcode = 'CC002', message = 'Solicitante e data de abertura não podem mudar';
  end if;

  if new.status is distinct from old.status then
    case new.status
      when 'concluido' then
        new.concluido_em := coalesce(new.concluido_em, now());
      when 'cancelado' then
        new.cancelado_em := coalesce(new.cancelado_em, now());
      else
        null;
    end case;
  end if;

  new.atualizado_em := now();
  return new;
end;
$$;

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

  if v_status in ('concluido', 'cancelado') then
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

-- -----------------------------------------------------------------------------
-- 7. Índice de prazo (fila) só com chamados não encerrados
-- -----------------------------------------------------------------------------
create index chamados_prazo_abertos_idx on public.chamados (prazo_sla)
  where status not in ('concluido', 'cancelado');

-- -----------------------------------------------------------------------------
-- 8. P-011 — funções novas sem EXECUTE para PUBLIC
-- Precisa ser global (sem "in schema"): o Postgres não permite revogar por
-- schema um privilégio que é concedido globalmente por padrão.
-- Vale para funções criadas daqui em diante pelo papel que roda as migrations.
-- Toda função nova precisa de GRANT EXECUTE explícito para quem for usá-la.
-- -----------------------------------------------------------------------------
alter default privileges revoke execute on functions from public;
