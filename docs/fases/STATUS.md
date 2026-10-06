# Status da Fase 1

| Etapa | Status | Observações |
|---|---|---|
| 1A-1 Banco | ✅ Concluída | 14 migrations, seed, 35 testes pgTAP passando (em outra máquina). Migration 0015 dos 6 status escrita depois, **ainda não executada** (P-023) |
| 1A-3 Entrega 1 — Base do front e perfis | ✅ Concluída | Dados simulados (ADR 0006); Next 16, 42 testes; lint, typecheck e build verdes |
| 1A-4 (parte) CI do front | ✅ Concluída | `.github/workflows/ci.yml` (formatação, lint, tipos, testes, build), PR template, `.editorconfig` |
| UI/UX — base visual do mockup | ✅ Concluída | `docs/ui-ux.md`; tokens, IBM Plex, lucide, cascas, componentes, rótulos; 59 testes |
| 1A-3 Entrega 2 — Parte A: abrir chamado | ✅ Concluída | Telas 1–3 do mockup; máquina de estados, formulário, horas úteis e anexos (Ctrl+V); 118 testes |
| 1A-3 Entrega 2 — Parte B: acompanhar | ✅ Concluída | Telas 4–5: chat, nova mensagem, cancelar, encerrado; migration 0017 `chamado_leituras`; 144 testes |
| 1A-3 Entrega 3 — Parte A: ações + quadro | ✅ Concluída | Quadro (kanban) com Próximo da fila, filtros, arrastar; ações com histórico e notificação; 173 testes |
| 1A-3 Entrega 3 — Parte B: tela de atendimento | ✅ Concluída | Chat com nota interna, painel de ações, modais, solicitante com contato, histórico completo, versão celular; 180 testes |
| 1A-2 API base + dados reais | ⏳ Pendente | Depende da aprovação do Supabase (P-022); login e papéis adiados pelo dono |
| 1A-4 (restante) CI de banco/API e docs | ⏳ Pendente | |
| 1E Teams | ⏳ Pendente | Depende do código do bot existente |
| 1F Fechamento | ⏳ Pendente | |

## Pendências externas
- [ ] App Registration no Entra ID + grupo `Central-Chamados-TI` (claim `groups`, só grupos atribuídos ao app)
- [ ] **Aprovação do Supabase pela diretoria** — praticamente ok, falta a assinatura (2026-10-06) — P-022
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
| 2026-10-06 | Quarta coluna "Concluídos" no quadro (últimos 7 dias, só leitura; arrastar para ela conclui com confirmação). Quatro colunas lado a lado a partir de ~1280 px; abaixo, rolagem lateral com atalhos das colunas. 183 testes + 10 E2E. |
| 2026-10-06 | Quadro sempre em kanban: abaixo de ~1024 px (janela estreita, zoom, celular) as colunas continuam lado a lado com rolagem lateral; antes mostrava uma coluna por vez e não parecia kanban. |
| 2026-10-06 | Supabase praticamente aprovado (falta assinatura) — P-022 atualizada. |
| 2026-10-06 | Área técnica só com o kanban (pedido do dono): saem o modo Lista e a alternância Quadro \| Lista; busca por texto filtra o quadro (`?busca=`, sem acento/maiúscula); "Ver encerrados" vira `/atendimento/encerrados` com cartões. 181 testes unitários e 10 E2E. Docs e prints atualizados. |
| 2026-10-06 | Testes E2E com Playwright (`pnpm e2e`: 9 fluxos dos critérios de pronto, computador e celular) e prints (`pnpm prints` → `docs/guia/img`). Revisão visual pelos prints: prazos de exemplo em horas úteis, cartão PRAZO sem previsão repetida, indicador de desenvolvimento do Next desligado. `docs/guia-usuario.md` (1 página, com prints). |
| 2026-10-06 | Entrega 3 Parte B: `/atendimento/[id]` com chat (seletor "Responder à Ana / Nota interna"), cartões AÇÕES (só as permitidas: assumir, concluir, transferir, aguardar/retomar, devolver, cancelar), PRAZO, SOLICITANTE (telefone e e-mail via `obterPerfilCompleto`, só TI), PEDIDO e HISTÓRICO completo (transferências com motivo). Modais de transferir/devolver/cancelar (motivo) e concluir (confirmação). Celular: faixa escura, botões e abas Conversa · Detalhes · Histórico. **1A-3 concluída** (com dados simulados). |
| 2026-10-06 | Entrega 3 Parte A: quadro em `/atendimento` (padrão) com "Próximo da fila" + Pegar o próximo, filtros na URL (responsável, categoria, prazo), colunas Novos (vencidos → transferidos para mim → prazo) · Em atendimento · Aguardando usuário, cartões com canhoto Nº, selos NOVO/Transferido, contador 💬, arrastar entre colunas (assumir/aguardar/retomar), destaque de chamado novo, versão celular com pílulas e Filtros. Lista com Assumir e "Ver encerrados". `executarAcao`/`proximoDaFila`/`contarNaoLidas` na camada de dados; histórico e notificações pendentes em toda ação, abertura e mensagem (simulada v5). |
| 2026-10-05 | Portal usa a largura da tela no computador (pedido do dono): grade de 3–4 colunas, Meus chamados em 2 colunas, passo 2 e chamado com painel lateral. Celular inalterado. `docs/ui-ux.md` atualizado. |
| 2026-10-05 | Entrega 2 Parte B: `/meus-chamados/[id]` no layout de foco com chat (pedido como 1ª mensagem, eventos em pílula, separador de dia, anexos em miniatura), envio otimista com "tentar de novo" mantendo o texto, faixa `SEM_CONEXAO`, volta automática aguardando → em andamento, "Ver detalhes do pedido", cancelar com motivo (só Recebido), encerrado com "Abrir novo pedido" (`?referente=`). Selo "• Nova mensagem" e contador do menu por não lidas. Simulada v4: mensagens, leituras, conversas de exemplo (#41 igual ao mockup). Migration 0017 `chamado_leituras` + teste 004 (não executados). |
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
