# ADR 0017 — Site e API num projeto só da Vercel (Services)

**Status:** aceito · **Data:** 2026-10-15 · **Substitui:** "Vercel: dois projetos (web e api)" do `CLAUDE.md`

## Contexto
O plano era publicar o site (`apps/web`) e a API (`apps/api`) como dois projetos da Vercel. Na hora de publicar, o
dono preferiu **um projeto só**: um endereço e um cartão no painel são mais fáceis de explicar para a diretoria. A
Vercel tem o recurso **Services** (vários serviços num projeto, com rotas compartilhadas e um domínio).

## Decisão
- **`vercel.json` na raiz** com dois serviços: `api` (`apps/api`, FastAPI) e `web` (`apps/web`, Next.js), região
  `gru1`. Rotas públicas: **`/api/...` → API** e **o resto → site**.
- **A API aceita o prefixo `/api`** (middleware `app/prefixo.py`): as rotas continuam as mesmas (`/chamados/42`) no
  local, no CI e na Vercel (`/api/chamados/42`).
- **O site chama a API pelo mesmo domínio:** `NEXT_PUBLIC_API_URL=/api` na Vercel (local: `http://localhost:8000`).
  Sem CORS entre os dois. No **servidor** do site (volta do login, `/auth/callback`) usa o endereço interno que a Vercel
  injeta pelo *binding* `API_INTERNA_URL` (web → api).
- **Variáveis compartilhadas:** num projeto só, site e API veem as mesmas variáveis. Proteção: o teste
  `lib/segredos-fora-do-site.test.ts` **falha o CI** se o código do site citar `SUPABASE_SERVICE_ROLE_KEY`,
  `DATABASE_URL`, `SUPABASE_JWT_SECRET` ou `service_role`. Só variáveis `NEXT_PUBLIC_*` chegam ao navegador.
- O projeto de demonstração (branch `demo`) foi excluído pelo dono; o modo simulado continua no código.

## Consequências
- Um projeto, um endereço (`https://<domínio>/` e `https://<domínio>/api/...`). Os dois serviços atualizam a cada
  commit no `main`.
- Os testes da API deixaram de ler o `apps/api/.env` local (`CENTRAL_ENV_FILE`), para nunca tocarem o banco da nuvem.
- Voltar a dois projetos é simples: apagar o `vercel.json` da raiz e importar cada pasta.
