# Etapa 1A-4 — CI e documentação base

## Objetivo
Pipeline no GitHub Actions e documentação mínima para qualquer pessoa da TI rodar o projeto.

## Escopo
1. **`.github/workflows/ci.yml`** (em todo PR e push na `main`):
   - Banco: `supabase start` + `supabase test db`.
   - API: `ruff check`, `ruff format --check`, `pytest` (contra o Supabase do job).
   - Web: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
2. **`.github/workflows/migrations.yml`**:
   - `dev`: `supabase db push` automático após merge na `main` (environment `dev`).
   - `prod`: só manual (`workflow_dispatch`) com aprovação obrigatória (environment `prod` com reviewers).
   - Deixar os jobs prontos mas desativados por condição (`if: vars.SUPABASE_DEV_PROJECT_ID != ''`) até os projetos existirem.
3. **Raiz**: `.gitignore` (inclui `.env*` exceto `.env.example`), `.editorconfig`, `.github/pull_request_template.md`
   (checklist: migration nova tem RLS + grant + teste? mensagens em pt-BR? sem segredos?).
4. **Docs**:
   - `docs/README.md`: pré-requisitos (Docker, Supabase CLI, uv, pnpm), setup local passo a passo, variáveis, comandos.
   - `docs/segredos.md`: tabela com cada chave (onde é usada, quem pode ver, onde está guardada, validade, como rotacionar).
     Incluir: anon key, service_role, senha `central_api`, JWT secret, client secret do Azure (**vence**), segredo do bot,
     segredo do webhook de notificações, `CRON_SECRET` da Vercel.
   - `docs/arquitetura.md`: diagrama Mermaid (navegador → Vercel web / Vercel api → Supabase; api → bot → Teams) e explicação curta.
   - `docs/banco.md`: diagrama ER (Mermaid) + dicionário de dados gerado a partir das migrations.
   - `docs/status.md`: máquina de estados (copiar a tabela do CLAUDE.md + diagrama Mermaid).
   - `docs/runbooks/`: `restaurar-backup.md`, `rotacionar-chave.md` (inclui `alter role central_api ... password`), `bot-parado.md` (rascunho).
5. **GitHub** (documentar em `docs/README.md`, não automatizar): secret scanning, push protection, branch protection na `main`,
   2FA obrigatório na organização, tokens fine-grained.

## Critérios de aceite
- CI verde num PR de teste.
- Uma pessoa nova consegue subir o projeto local só seguindo `docs/README.md`.
