# Pendências, problemas conhecidos e decisões em aberto

Lista viva. **Toda sessão** que encontrar um problema ou resolver um item atualiza este arquivo (regra no `CLAUDE.md`).

- Código `P-NNN` sequencial, nunca reaproveitado. Item resolvido vai para **Resolvidas**, com data e como foi resolvido.
- **Tipo:** `ambiente` · `regra` (decisão de negócio, precisa do dono do projeto) · `banco` · `api` · `web` · `docs`.
- **Gravidade:** 🔴 bloqueia o próximo passo · 🟡 resolver antes do go-live · ⚪ melhoria.
- Pendências externas (Entra ID, projetos Supabase, bot) continuam em `docs/fases/STATUS.md`.

## Abertas

| Código | Gravidade | Tipo | Descrição | Onde resolver |
|---|---|---|---|---|
| P-005 | 🟡 | regra | Quem marca `profiles.ativo = false` quando alguém sai da empresa? Sem Graph, nada sincroniza; hoje só o login no Entra barra. | Antes do go-live |
| P-008 | 🟡 | regra | Tela de Configurações adiada: categorias, campos, SLA e feriados só mudam por migration/SQL. Feriados cadastrados só até 2027. | Antes de dez/2027 ou na Fase 2 |
| P-009 | 🟡 | banco | Solicitante com `ativo = false` ainda lê os próprios chamados, mensagens e histórico direto pelo Supabase (as policies só checam `ativo` para a TI). O bloqueio previsto fica só na API. | Migration nova (junto com P-005) |
| P-010 | ⚪ | banco | Trocar a categoria de um chamado não recalcula `area_id` nem `prazo_sla` (só calculados na abertura). | 1B / regra de recategorização |
| P-013 | ⚪ | banco | Usuário com chamados não pode ser excluído de `auth.users` (FK sem cascata, de propósito). Desligamento precisa ser `ativo = false`. | Documentar em runbook (1A-4) |
| P-014 | 🟡 | banco | Não há procedimento para levar o `seed.sql` à produção: `supabase db push` não roda seed. | 1A-4 / `docs/go-live.md` |
| P-015 | ⚪ | ambiente | `[auth.external.azure] enabled = true` no `config.toml` lê variáveis que ainda não existem; conferir se o `supabase start` local funciona sem elas. | Início da 1A-2 |
| P-016 | ⚪ | docs | O `CLAUDE.md` cita `supabase/seed.dev.sql`, que ainda não existe (previsto na 1A-2). | 1A-2 |
| P-021 | ⚪ | regra | Alerta de chamado `transferido` parado (ideia do dono, sem pressa). | Fase 2 |
| P-002 | 🟡 | ambiente | Ambiente local de banco (Docker, Supabase CLI) **adiado pelo dono**: nada de banco é executado até a decisão sobre o Supabase (P-022). `uv` e `pnpm` ainda faltam na máquina (o `pnpm` será necessário para o front). | Quando P-022 for decidido |
| P-022 | 🔴 | ambiente | **Supabase em avaliação pela diretoria** (pagamento e novo projeto). Se não for aprovado, revisar ADRs 0001–0004 (Auth, RLS, Realtime e Storage dependem dele). | Diretoria |
| P-023 | 🟡 | banco | Migration 0015 e os testes `001` (33) e `002` (18) **nunca foram executados**. Rodar `supabase db reset` + `supabase test db` assim que houver Supabase (local ou nuvem). | Quando P-022/P-002 forem resolvidos |
| P-024 | 🔴 | regra | Front antes do banco e da API: de onde a interface tira os dados enquanto o Supabase não existe? A 1A-3 pressupõe a 1A-2 pronta. | Antes da 1A-3 Entrega 1 |

## Resolvidas

| Código | Data | Como foi resolvido |
|---|---|---|
| P-006 | 2026-10-05 | Técnico **pode** abrir chamado: a TI também vê o formulário de abertura (ajustar a nova 1A-3). |
| P-007 | 2026-10-05 | Resolver **não** grava mensagem automática no chat; o encerramento segue só pela mudança de status. |
| P-019 | 2026-10-05 | Migration `20261005120000_status_simplificados.sql` + testes `002_status.test.sql`. Escrita, não executada (P-023). |
| P-011 | 2026-10-05 | `alter default privileges revoke execute on functions from public` na mesma migration (global: o Postgres não permite revogar por schema). Teste na `002`. |
| P-001 | 2026-10-05 | `git init` (branch `main`) + commit inicial; `.gitattributes` fixa quebra de linha LF. |
| P-020 | 2026-10-05 | Nova 1A-3 salva já com os 6 status; 1B/1C/1D receberam aviso de desatualizados. `escopo.md` continua como documento de origem (CLAUDE.md e ADRs prevalecem). |
| P-018 | 2026-10-05 | Status simplificados para 6 (`docs/adr/0005`). Concluído é final; técnico conclui mesmo sem resposta do solicitante; sem fechamento automático. |
| P-003 | 2026-10-05 | Qualquer técnico pode devolver um `transferido` à fila (ADR 0005). Alerta de parado virou P-021. |
| P-004 | 2026-10-05 | Devolver à fila limpa o responsável (ADR 0005). |
| P-012 | 2026-10-05 | Coberto pela migration de P-019 (checks dos novos status). |
| P-017 | 2026-10-05 | Aprovado: o `ci.yml` básico (1A-4) entra antes da 1A-3 Entrega 2. |
