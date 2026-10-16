-- =============================================================================
-- 0029 — A API (central_api) usa app.proxima_abertura no aviso "A equipe volta amanhã às 8h" (ADR 0019).
-- A 0028 criou a função sem o GRANT (os defaults de execução foram revogados — migration 0009).
-- =============================================================================

grant execute on function
  app.proxima_abertura(timestamptz),
  app.eh_horario_util(timestamptz)
to central_api;
