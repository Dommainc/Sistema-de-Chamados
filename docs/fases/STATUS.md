# Status da Fase 1

| Etapa | Status | Observações |
|---|---|---|
| 1A-1 Banco | ✅ Concluída | 14 migrations, seed, 35 testes pgTAP passando |
| 1A-2 API base | ⏳ Pendente | Inclui a migration dos 6 status (P-019) |
| 1A-3 Entrega 1 — Base do front e perfis | ⏳ Pendente | |
| 1A-4 CI e docs | ⏳ Pendente | Antecipada para antes da Entrega 2 (P-017) |
| 1A-3 Entrega 2 — Portal do solicitante | ⏳ Pendente | |
| 1A-3 Entrega 3 — Área técnica | ⏳ Pendente | |
| 1E Teams | ⏳ Pendente | Depende do código do bot existente |
| 1F Fechamento | ⏳ Pendente | |

## Pendências externas
- [ ] App Registration no Entra ID + grupo `Central-Chamados-TI` (claim `groups`, só grupos atribuídos ao app)
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
| 2026-10-05 | Repositório git criado (P-001), `.gitattributes` com LF, commits com e-mail da DOMMA e publicado em `github.com/Dommainc/Sistema-de-Chamados` (privado). |
| 2026-10-05 | Nova `1A-3-experiencia-por-perfil.md` (3 entregas, ajustada ao ADR 0005) substitui `1A-3-web-base.md`; 1B/1C/1D viram referência; nova ordem no README das fases; migration dos status incluída na 1A-2; `CLAUDE.md` com URLs e papéis novos. |
| 2026-10-05 | ADR 0005: 6 status (pendente, em_andamento, aguardando_usuario, transferido, concluido, cancelado); tabela do `CLAUDE.md` atualizada. Abertos P-019 (migration), P-020, P-021. |
| 2026-10-05 | Decisões: técnico abre chamado (P-006), resolver sem mensagem automática (P-007), CI antes da Entrega 2 (P-017). Aberto P-018 (modelo de status). |
| 2026-10-05 | Revisão geral do projeto. Criado `docs/pendencias.md` (P-001 a P-017) e regra de atualização no `CLAUDE.md`. |
| 2026-10-03 | Etapa 1A-1 concluída: 14 migrations, seed, 35 testes pgTAP. |
