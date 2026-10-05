# ADR 0001 — Supabase na região sa-east-1 (São Paulo)

**Status:** aceito · **Data:** 2026-10-03

## Decisão
Banco, Auth, Realtime e Storage no Supabase, região **South America (São Paulo) — `sa-east-1`**.
Dois projetos separados: `dev` e `prod`, ambos nessa região. Produção no plano Pro.

## Motivos
- Dados de colaboradores ficam no Brasil (facilita a adequação à LGPD).
- Menor latência para usuários no Rio.
- Funções da Vercel também em São Paulo (`gru1`), perto do banco.

## Consequências
- A região não pode ser trocada depois sem migrar o projeto: conferir na criação.
- Critério de pronto da Fase 1: projeto de produção confirmado em `sa-east-1`.
