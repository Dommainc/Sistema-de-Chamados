-- =============================================================================
-- 0013 — Realtime
-- O Realtime respeita o RLS: cada usuário só recebe eventos das linhas que pode
-- ler (mensagens internas não chegam ao solicitante).
-- =============================================================================

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.chamados, public.mensagens, public.historico;
  end if;
end
$$;
