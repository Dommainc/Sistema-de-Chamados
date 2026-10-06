# Fases — como usar com o Claude Code

Abra o repositório no VS Code com o Claude Code e, para cada etapa, cole:

> Execute a etapa descrita em `docs/fases/<arquivo>.md`. Siga o CLAUDE.md: apresente o plano e espere minha aprovação antes de escrever código.

Uma etapa (ou entrega) por sessão (`/clear` entre elas). Ordem:

| # | Arquivo | Entrega |
|---|---|---|
| 1 | `1A-1-banco.md` | ✅ Migrations, seed e testes do banco (+ migration 0015 dos 6 status, não executada) |
| 2 | `1A-3-experiencia-por-perfil.md` — Entrega 1 | Base do front, camada de dados simulada, separação solicitante × TI |
| 3 | `1A-4-ci-docs.md` — só o CI do front | Lint, typecheck, testes e build do `apps/web` |
| 3b | `docs/ui-ux.md` | ✅ Base visual do mockup (cores, fontes, componentes, cascas) |
| 4 | `1A-3-experiencia-por-perfil.md` — Entrega 2 | Portal do solicitante (abrir, acompanhar, chat, anexos) |
| 5 | `1A-3-experiencia-por-perfil.md` — Entrega 3 | Área técnica (fila, ações, chat com notas internas) |
| 6 | `1A-2-api-base.md` + implementação `real` | API, banco ligado e troca da camada de dados (depende da aprovação do Supabase) |
| 7 | `1A-4-ci-docs.md` — restante | CI de banco e API, docs, runbooks |
| 8 | `1E-teams.md` | Notificações e resposta automática do bot |
| 9 | `1F-fechamento.md` | Revisão de erros, docs finais, critérios de pronto |

**O bot do Teams (1E) é a última etapa de construção** (decisão do dono, 2026-10-06): até lá, as ações só gravam
as notificações como `pendente` (outbox, ADR 0003).

O front é construído primeiro com **dados simulados** (`docs/adr/0006`), porque o Supabase está em avaliação pela diretoria.

`1B-chamados.md`, `1C-chat-anexos.md` e `1D-fila-ti.md` **não são mais etapas**: foram absorvidos pela 1A-3 e servem
só como referência das regras de API, banco e erros. Os status citados neles estão desatualizados (vale o `docs/adr/0005`).

Supabase na nuvem (dev e prod em `sa-east-1`) e Entra ID real entram quando estiverem prontos;
até lá, tudo roda local (ver "Desenvolvimento local sem Entra ID" no CLAUDE.md).
