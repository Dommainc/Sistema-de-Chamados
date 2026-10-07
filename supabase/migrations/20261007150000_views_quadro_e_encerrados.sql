-- =============================================================================
-- 0020 — Views para o quadro da TI e para "Ver encerrados" (consultas leves com dados reais)
--
-- Antes: o quadro lia TODOS os chamados, depois o histórico de cada transferido (1 consulta por
-- chamado) e a contagem de não lidas; "Ver encerrados" trazia todos de uma vez.
-- Agora:
--   chamados_quadro      → só o que o quadro mostra (abertos + encerrados dos últimos 7 dias), já com
--                          quem transferiu e quantas mensagens o USUÁRIO LOGADO ainda não leu;
--   chamados_encerrados  → concluídos e cancelados com a data de encerramento, para paginar
--                          (PostgREST: order=encerrado_em.desc + Range).
-- security_invoker = true: as views rodam com as permissões de quem consulta, então o RLS de
-- chamados, historico, mensagens e chamado_leituras continua valendo (solicitante só vê o que é seu;
-- nota interna e motivo de transferência não aparecem para ele).
-- =============================================================================

create view public.chamados_quadro
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
      and m.autor_id <> auth.uid()
      and m.criado_em > coalesce(
            (select l.lido_ate
               from public.chamado_leituras l
              where l.chamado_id = c.id and l.profile_id = auth.uid()),
            '-infinity'::timestamptz)) as nao_lidas
from public.chamados c
where c.status not in ('concluido', 'cancelado')
   or coalesce(c.concluido_em, c.cancelado_em) >= now() - interval '7 days';

comment on view public.chamados_quadro is
  'Quadro da TI: abertos + encerrados dos últimos 7 dias, com transferido_por e nao_lidas (do usuário logado).';

create view public.chamados_encerrados
with (security_invoker = true) as
select
  c.id, c.titulo, c.categoria_id, c.area_id, c.solicitante_id, c.responsavel_id, c.status,
  c.prioridade, c.respostas_form, c.prazo_sla, c.criado_em, c.atualizado_em, c.concluido_em,
  c.cancelado_em, c.motivo_cancelamento,
  coalesce(c.concluido_em, c.cancelado_em) as encerrado_em
from public.chamados c
where c.status in ('concluido', 'cancelado');

comment on view public.chamados_encerrados is
  '"Ver encerrados": concluídos e cancelados com encerrado_em, para paginar do mais recente ao mais antigo.';

-- Os defaults do Supabase foram revogados (0001): grants explícitos.
revoke all on public.chamados_quadro, public.chamados_encerrados from anon, authenticated;
grant select on public.chamados_quadro, public.chamados_encerrados to authenticated, central_api;

-- Índices das consultas acima.
create index historico_transferido_idx on public.historico (chamado_id, id desc)
  where acao = 'transferido';
create index chamados_encerrado_em_idx on public.chamados ((coalesce(concluido_em, cancelado_em)) desc)
  where status in ('concluido', 'cancelado');
