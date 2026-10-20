-- =============================================================================
-- 0034 — Técnico não atende o próprio chamado (dono, 2026-10-20)
--
-- Quem abriu o chamado não pode ser o responsável: outro técnico inicia (e não se transfere para quem abriu).
-- A API e o site já recusam (CHAMADO_PROPRIO); o banco garante. NOT VALID: vale para o que for gravado daqui
-- em diante (um chamado de teste antigo, já concluído, ficou assim e não muda mais).
-- =============================================================================

alter table public.chamados
  add constraint chamados_tecnico_nao_e_solicitante
  check (responsavel_id is null or responsavel_id <> solicitante_id) not valid;
