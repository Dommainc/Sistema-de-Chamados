# Fases — como usar com o Claude Code

Abra o repositório no VS Code com o Claude Code e, para cada etapa, cole:

> Execute a etapa descrita em `docs/fases/<arquivo>.md`. Siga o CLAUDE.md: apresente o plano e espere minha aprovação antes de escrever código.

Uma etapa (ou entrega) por sessão (`/clear` entre elas). Ordem:

| # | Arquivo | Entrega |
|---|---|---|
| 1 | `1A-1-banco.md` | ✅ Migrations, seed e testes do banco |
| 2 | `1A-2-api-base.md` | Esqueleto da FastAPI, conexão, auth, catálogo de erros, migration dos 6 status |
| 3 | `1A-3-experiencia-por-perfil.md` — Entrega 1 | Base do front, login, separação solicitante × TI |
| 4 | `1A-4-ci-docs.md` | GitHub Actions, README, segredos, runbooks |
| 5 | `1A-3-experiencia-por-perfil.md` — Entrega 2 | Portal do solicitante (abrir, acompanhar, chat, anexos) |
| 6 | `1A-3-experiencia-por-perfil.md` — Entrega 3 | Área técnica (fila, ações, chat com notas internas) |
| 7 | `1E-teams.md` | Notificações e resposta automática do bot |
| 8 | `1F-fechamento.md` | Revisão de erros, docs finais, critérios de pronto |

`1B-chamados.md`, `1C-chat-anexos.md` e `1D-fila-ti.md` **não são mais etapas**: foram absorvidos pela 1A-3 e servem
só como referência das regras de API, banco e erros. Os status citados neles estão desatualizados (vale o `docs/adr/0005`).

Supabase na nuvem (dev e prod em `sa-east-1`) e Entra ID real entram quando estiverem prontos;
até lá, tudo roda local (ver "Desenvolvimento local sem Entra ID" no CLAUDE.md).
