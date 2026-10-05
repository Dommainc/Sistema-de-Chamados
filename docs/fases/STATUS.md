# Status da Fase 1

| Etapa | Status | Observações |
|---|---|---|
| 1A-1 Banco | ✅ Concluída | 14 migrations, seed, 35 testes pgTAP passando (em outra máquina). Migration 0015 dos 6 status escrita depois, **ainda não executada** (P-023) |
| 1A-3 Entrega 1 — Base do front e perfis | ✅ Concluída | Dados simulados (ADR 0006); Next 16, 42 testes; lint, typecheck e build verdes |
| 1A-4 (parte) CI do front | ✅ Concluída | `.github/workflows/ci.yml` (formatação, lint, tipos, testes, build), PR template, `.editorconfig` |
| UI/UX — base visual do mockup | ✅ Concluída | `docs/ui-ux.md`; tokens, IBM Plex, lucide, cascas, componentes, rótulos; 59 testes |
| 1A-3 Entrega 2 — Parte A: abrir chamado | ✅ Concluída | Telas 1–3 do mockup; máquina de estados, formulário, horas úteis e anexos (Ctrl+V); 118 testes |
| 1A-3 Entrega 2 — Parte B: acompanhar | ⏳ Pendente | Telas 4–5: chat, nova mensagem, cancelar, `chamado_leituras` |
| 1A-3 Entrega 3 — Área técnica | ⏳ Pendente | Dados simulados; telas 6–9 do mockup |
| 1A-2 API base + dados reais | ⏳ Pendente | Depende da aprovação do Supabase (P-022); login e papéis adiados pelo dono |
| 1A-4 (restante) CI de banco/API e docs | ⏳ Pendente | |
| 1E Teams | ⏳ Pendente | Depende do código do bot existente |
| 1F Fechamento | ⏳ Pendente | |

## Pendências externas
- [ ] App Registration no Entra ID + grupo `Central-Chamados-TI` (claim `groups`, só grupos atribuídos ao app)
- [ ] **Aprovação do Supabase pela diretoria** (custo / novo projeto) — P-022
- [ ] Projetos Supabase `dev` e `prod` em `sa-east-1`
- [ ] Validar no Supabase hospedado: `grant authenticated to central_api` (migration 0001)
- [ ] Validar se o Supabase repassa o claim `groups` no login (ADR 0004)
- [ ] Acesso ao código do bot do Teams (linguagem/SDK)
- [ ] Padrão visual do Cadastro de Insumos (cores, componentes)

## Problemas e decisões em aberto
Ver `docs/pendencias.md`.

## Registro de mudanças
Mais recente primeiro. Uma linha por sessão que alterou o projeto.

| Data | O que mudou |
|---|---|
| 2026-10-05 | Entrega 2 Parte A: abrir chamado em 3 passos (`/`, `/abrir/[categoria]`, `/abrir/pronto/[id]`; TI em `/atendimento/novo/...`). `lib/dominio/estados.ts` (tabela do CLAUDE.md), `formulario.ts`, `horario-util.ts` (horas úteis, espelho do banco), `lib/anexos.ts`. Campos dinâmicos (cartões de rádio/seleção), anexos com botão, arrastar e Ctrl+V (`print-AAAAMMDD-HHMMSS.png`), rascunho mantido no Voltar, previsão antes de enviar, "Referente ao chamado #N". Simulada v3: histórico, anexos no IndexedDB. |
| 2026-10-05 | UI/UX: mockup do dono descrito em `docs/ui-ux.md` (adaptado ao ADR 0005: sem Resolvido/confirmação; contato = telefone). Cores e fontes IBM Plex, ícones lucide, cascas do portal (menu inferior) e da área técnica (barra escura, Quadro/Lista, busca), componentes novos, rótulos Recebido/Em atendimento/Novo, `lib/prazo.ts`. Migration 0016 (ícone e nome curto das categorias, não executada). Dados simulados com os chamados #30–#45 do mockup. |
| 2026-10-05 | CI do front no GitHub Actions, template de PR e `.editorconfig` (parte da 1A-4). Próximo: UI/UX (ideias do dono) e Entrega 2. |
| 2026-10-05 | 1A-3 Entrega 1: `apps/web` (Next 16.3, React 19, Tailwind 4, Vitest). Login simulado, `proxy.ts` por papel, link universal `/chamados/42`, primeiro acesso, layouts das duas áreas, componentes base, catálogo de erros, camada de dados simulada. |
| 2026-10-05 | ADR 0006: front com camada de dados simulada; nova ordem (front antes da API); 1A-3 ajustada (P-024). |
| 2026-10-05 | Migration 0015 (6 status, sem fechamento automático, P-011), testes 001 ajustado (33) e 002 novo (18), seed sem `dias_fechamento_automatico`. Nada executado: Supabase aguardando aprovação da diretoria. |
| 2026-10-05 | Repositório git criado (P-001), `.gitattributes` com LF, commits com e-mail da DOMMA e publicado em `github.com/Dommainc/Sistema-de-Chamados` (privado). |
| 2026-10-05 | Nova `1A-3-experiencia-por-perfil.md` (3 entregas, ajustada ao ADR 0005) substitui `1A-3-web-base.md`; 1B/1C/1D viram referência; nova ordem no README das fases; migration dos status incluída na 1A-2; `CLAUDE.md` com URLs e papéis novos. |
| 2026-10-05 | ADR 0005: 6 status (pendente, em_andamento, aguardando_usuario, transferido, concluido, cancelado); tabela do `CLAUDE.md` atualizada. Abertos P-019 (migration), P-020, P-021. |
| 2026-10-05 | Decisões: técnico abre chamado (P-006), resolver sem mensagem automática (P-007), CI antes da Entrega 2 (P-017). Aberto P-018 (modelo de status). |
| 2026-10-05 | Revisão geral do projeto. Criado `docs/pendencias.md` (P-001 a P-017) e regra de atualização no `CLAUDE.md`. |
| 2026-10-03 | Etapa 1A-1 concluída: 14 migrations, seed, 35 testes pgTAP. |
