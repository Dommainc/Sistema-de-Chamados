# Etapa 1A-1 — Banco ✅ concluída

Já entregue em `supabase/`. Referência:
- `migrations/` 0001–0014: schema, RLS, Storage, índices, Realtime, fechamento automático.
- `migrations/20261005120000_status_simplificados.sql` (0015, depois da etapa): 6 status do ADR 0005, remove o fechamento automático, funções novas sem EXECUTE público.
- `seed.sql`: área TI, 13 categorias com SLA, campos de formulário, configurações, feriados 2026–2027.
- `tests/database/001_rls_e_regras.test.sql`: 33 testes; `002_status.test.sql`: 18 testes (`supabase test db`).

Ao começar a 1A-2, rode `supabase start` e `supabase test db` para confirmar que tudo passa no seu Docker.
