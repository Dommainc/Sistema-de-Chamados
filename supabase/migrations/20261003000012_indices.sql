-- =============================================================================
-- 0012 — Índices (fila, RLS, chat, histórico e outbox)
-- =============================================================================

-- Fila da TI e filtros
create index chamados_status_idx         on public.chamados (status);
create index chamados_responsavel_idx    on public.chamados (responsavel_id);
create index chamados_area_idx           on public.chamados (area_id);
create index chamados_categoria_idx      on public.chamados (categoria_id);
create index chamados_criado_em_idx      on public.chamados (criado_em desc);
create index chamados_prazo_abertos_idx  on public.chamados (prazo_sla)
  where status not in ('resolvido', 'fechado', 'cancelado');

-- RLS do solicitante ("meus chamados")
create index chamados_solicitante_idx    on public.chamados (solicitante_id, criado_em desc);

-- Busca por título na fila
create index chamados_titulo_trgm_idx    on public.chamados using gin (titulo extensions.gin_trgm_ops);

-- Fechamento automático
create index chamados_resolvidos_idx     on public.chamados (resolvido_em) where status = 'resolvido';

-- Chat, anexos, histórico
create index mensagens_chamado_idx       on public.mensagens (chamado_id, criado_em);
create index anexos_chamado_idx          on public.anexos (chamado_id);
create index anexos_mensagem_idx         on public.anexos (mensagem_id) where mensagem_id is not null;
create index historico_chamado_idx       on public.historico (chamado_id, criado_em);
create index transferencias_chamado_idx  on public.transferencias (chamado_id, criado_em);

-- Formulário dinâmico
create index categorias_area_idx         on public.categorias (area_id, ordem);
create index campos_form_categoria_idx   on public.campos_form (categoria_id, ordem);

-- Outbox de notificações
create index notificacoes_pendentes_idx  on public.notificacoes (proxima_tentativa_em)
  where status = 'pendente';
create index notificacoes_chamado_idx    on public.notificacoes (chamado_id);

create index bot_respostas_criado_em_idx on public.bot_respostas_automaticas (criado_em desc);
