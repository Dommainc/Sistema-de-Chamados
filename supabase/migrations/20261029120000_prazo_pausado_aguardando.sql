-- =============================================================================
-- 0035 — Prazo pausado enquanto aguarda o solicitante (decisão do dono, 2026-10-29 — docs/adr/0021)
--
-- Enquanto o chamado está em "aguardando_usuario", o prazo fica parado: ao entrar, o gatilho marca
-- chamados.sla_pausado_em; ao sair (o solicitante respondeu, ou a TI concluiu, transferiu ou cancelou, ou a
-- conclusão automática das 48 h), o prazo anda para frente pelo tempo que ficou parado (tempo corrido),
-- soma em sla_pausado_total e grava historico 'prazo_ajustado' (público: o solicitante vê a nova previsão).
-- Sem aviso no Teams. Pausa menor que 1 minuto não mexe no prazo.
-- Se a TI muda o prazo durante a espera, a pausa recomeça a contar a partir da mudança.
-- As colunas sla_pausado_em / sla_pausado_total já existiam (reservadas desde a base, migration 0005).
-- Com o prazo empurrado, "concluído no prazo" (dashboard e resumo mensal) já desconta a espera.
-- =============================================================================

create or replace function app.chamados_antes_atualizar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pausa interval;
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

    -- Prazo pausado (ADR 0021).
    if new.status = 'aguardando_usuario' then
      new.sla_pausado_em := now();
    elsif old.status = 'aguardando_usuario' then
      v_pausa := greatest(now() - coalesce(old.sla_pausado_em, now()), interval '0');
      new.sla_pausado_total := old.sla_pausado_total + v_pausa;
      new.sla_pausado_em := null;
      if old.prazo_sla is not null
         and new.prazo_sla is not distinct from old.prazo_sla
         and v_pausa >= interval '1 minute' then
        new.prazo_sla := old.prazo_sla + v_pausa;
        insert into public.historico (chamado_id, autor_id, acao, de, para, detalhe, publico)
        values (
          new.id, null, 'prazo_ajustado', old.status::text, new.status::text,
          jsonb_build_object(
            'prazo', new.prazo_sla,
            'prazo_anterior', old.prazo_sla,
            'pausa_minutos', (floor(extract(epoch from v_pausa) / 60))::bigint::text
          ),
          true
        );
      end if;
    end if;
  elsif new.status = 'aguardando_usuario' and new.prazo_sla is distinct from old.prazo_sla then
    -- Prazo novo durante a espera: a pausa recomeça a contar a partir de agora.
    new.sla_pausado_total := old.sla_pausado_total
      + greatest(now() - coalesce(old.sla_pausado_em, now()), interval '0');
    new.sla_pausado_em := now();
  end if;

  new.atualizado_em := now();
  return new;
end;
$$;

comment on column public.chamados.sla_pausado_em is
  'Desde quando o prazo está parado (chamado em aguardando_usuario); nulo fora da espera. ADR 0021.';
comment on column public.chamados.sla_pausado_total is
  'Soma das esperas pelo solicitante (o prazo foi empurrado por esse tempo). ADR 0021.';

-- Chamados que já estão aguardando: a pausa começa quando entraram em "aguardando_usuario".
-- Sem o gatilho, para não mexer em atualizado_em.
alter table public.chamados disable trigger chamados_antes_atualizar;
update public.chamados c
   set sla_pausado_em = coalesce(
         (select max(h.criado_em) from public.historico h
           where h.chamado_id = c.id and h.para = 'aguardando_usuario'),
         c.atualizado_em)
 where c.status = 'aguardando_usuario' and c.sla_pausado_em is null;
alter table public.chamados enable trigger chamados_antes_atualizar;

-- O quadro e os encerrados mostram "Pausado há…": a coluna entra no fim das views (create or replace mantém
-- os grants de 20261007150000_views_quadro_e_encerrados).
create or replace view public.chamados_quadro
with (security_invoker = true) as
select
  c.id, c.titulo, c.categoria_id, c.area_id, c.solicitante_id, c.responsavel_id, c.status,
  c.prioridade, c.respostas_form, c.prazo_sla, c.criado_em, c.atualizado_em, c.concluido_em,
  c.cancelado_em, c.motivo_cancelamento,
  (select h.autor_id
     from public.historico h
    where h.chamado_id = c.id and h.acao = 'transferido'
    order by h.id desc
    limit 1) as transferido_por,
  (select count(*)::int
     from public.mensagens m
    where m.chamado_id = c.id
      and m.autor_id is distinct from auth.uid()
      and (m.autor_id is not null or not (select app.eh_ti()))
      and m.criado_em > coalesce(
            (select l.lido_ate
               from public.chamado_leituras l
              where l.chamado_id = c.id and l.profile_id = auth.uid()),
            '-infinity'::timestamptz)) as nao_lidas,
  c.sla_pausado_em
from public.chamados c
where c.status not in ('concluido', 'cancelado')
   or coalesce(c.concluido_em, c.cancelado_em) >= now() - interval '7 days';

create or replace view public.chamados_encerrados
with (security_invoker = true) as
select
  c.id, c.titulo, c.categoria_id, c.area_id, c.solicitante_id, c.responsavel_id, c.status,
  c.prioridade, c.respostas_form, c.prazo_sla, c.criado_em, c.atualizado_em, c.concluido_em,
  c.cancelado_em, c.motivo_cancelamento,
  coalesce(c.concluido_em, c.cancelado_em) as encerrado_em,
  c.sla_pausado_em
from public.chamados c
where c.status in ('concluido', 'cancelado');
