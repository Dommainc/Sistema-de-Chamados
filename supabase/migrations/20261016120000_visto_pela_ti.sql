-- =============================================================================
-- 0026 — "Visto" no chat (pedido do dono, 2026-10-16)
--
-- A TI vê até quando o SOLICITANTE leu a conversa (✓ enviada · ✓✓ vista nos balões da TI). O solicitante
-- continua vendo só a própria leitura (não vê se a TI leu). Escrita segue só pela API (migration 0017).
-- Entra no Realtime para o ✓✓ aparecer na hora, com a TI na tela.
-- =============================================================================

create policy chamado_leituras_ti_ve_solicitante on public.chamado_leituras
  for select to authenticated
  using (
    (select app.eh_ti())
    and exists (
      select 1 from public.chamados c
       where c.id = chamado_leituras.chamado_id
         and c.solicitante_id = chamado_leituras.profile_id
    )
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.chamado_leituras;
  end if;
end
$$;
