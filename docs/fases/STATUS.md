# Status da Fase 1

| Etapa | Status | Observações |
|---|---|---|
| 1A-1 Banco | ✅ Concluída | 14 migrations, seed, 35 testes pgTAP passando (em outra máquina). Migration 0015 dos 6 status escrita depois, **ainda não executada** (P-023) |
| 1A-3 Entrega 1 — Base do front e perfis | ⏳ Pendente | Com dados simulados (ADR 0006) |
| 1A-4 (parte) CI do front | ⏳ Pendente | Antes da Entrega 2 (P-017) |
| 1A-3 Entrega 2 — Portal do solicitante | ⏳ Pendente | Dados simulados |
| 1A-3 Entrega 3 — Área técnica | ⏳ Pendente | Dados simulados |
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
| 2026-10-05 | ADR 0006: front com camada de dados simulada; nova ordem (front antes da API); 1A-3 ajustada (P-024). |
| 2026-10-05 | Migration 0015 (6 status, sem fechamento automático, P-011), testes 001 ajustado (33) e 002 novo (18), seed sem `dias_fechamento_automatico`. Nada executado: Supabase aguardando aprovação da diretoria. |
| 2026-10-05 | Repositório git criado (P-001), `.gitattributes` com LF, commits com e-mail da DOMMA e publicado em `github.com/Dommainc/Sistema-de-Chamados` (privado). |
| 2026-10-05 | Nova `1A-3-experiencia-por-perfil.md` (3 entregas, ajustada ao ADR 0005) substitui `1A-3-web-base.md`; 1B/1C/1D viram referência; nova ordem no README das fases; migration dos status incluída na 1A-2; `CLAUDE.md` com URLs e papéis novos. |
| 2026-10-05 | ADR 0005: 6 status (pendente, em_andamento, aguardando_usuario, transferido, concluido, cancelado); tabela do `CLAUDE.md` atualizada. Abertos P-019 (migration), P-020, P-021. |
| 2026-10-05 | Decisões: técnico abre chamado (P-006), resolver sem mensagem automática (P-007), CI antes da Entrega 2 (P-017). Aberto P-018 (modelo de status). |
| 2026-10-05 | Revisão geral do projeto. Criado `docs/pendencias.md` (P-001 a P-017) e regra de atualização no `CLAUDE.md`. |
| 2026-10-03 | Etapa 1A-1 concluída: 14 migrations, seed, 35 testes pgTAP. |
