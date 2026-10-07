# Pendências, problemas conhecidos e decisões em aberto

Lista viva. **Toda sessão** que encontrar um problema ou resolver um item atualiza este arquivo (regra no `CLAUDE.md`).

- Código `P-NNN` sequencial, nunca reaproveitado. Item resolvido vai para **Resolvidas**, com data e como foi resolvido.
- **Tipo:** `ambiente` · `regra` (decisão de negócio, precisa do dono do projeto) · `banco` · `api` · `web` · `docs`.
- **Gravidade:** 🔴 bloqueia o próximo passo · 🟡 resolver antes do go-live · ⚪ melhoria.
- Pendências externas (Entra ID, projetos Supabase, bot) continuam em `docs/fases/STATUS.md`.

## Abertas

| Código | Gravidade | Tipo | Descrição | Onde resolver |
|---|---|---|---|---|
| P-021 | ⚪ | regra | Alerta de chamado `transferido` parado (ideia do dono, sem pressa). | Fase 2 |
| P-002 | 🟡 | ambiente | Ambiente local de banco (Docker, Supabase CLI) **adiado pelo dono**: nada de banco é executado até a decisão sobre o Supabase (P-022). `uv` e `pnpm` ainda faltam na máquina (o `pnpm` será necessário para o front). | Quando P-022 for decidido |
| P-022 | 🟡 | ambiente | **Supabase praticamente aprovado pela diretoria — falta só a assinatura** (atualizado em 2026-10-06). Depois: criar projetos `dev` e `prod` em `sa-east-1` (ADR 0001) e rodar as migrations (P-023). | Assinatura da diretoria |
| P-027 | ⚪ | docs | Salvar o PDF do mockup em `docs/ui/central-chamados-ui-ux.pdf` (o `docs/ui-ux.md` aponta para ele). | Dono do projeto |
| P-030 | ⚪ | web | No modo simulado, a sessão fica num cookie: **um navegador = um usuário por vez**. Para ver Ana e Rafael ao mesmo tempo, abra a aba da Ana, depois entre como Rafael em outra aba — a da Ana continua como Ana até recarregar (é o que o E2E faz). Some com o login real. | Implementação real (1A-2) |
| P-031 | ⚪ | ci | `pnpm e2e` não roda no CI (baixar o navegador deixa o CI lento). Incluir quando a implementação real existir, junto com o banco local no CI. | 1A-4 restante |
| P-032 | 🟡 | api | Confirmar o ponto de entrada da API na Vercel (FastAPI em `app/main.py`) no primeiro deploy; ajustar `vercel.json` se a Vercel não detectar sozinha. | Primeiro deploy |
| P-033 | ⚪ | ambiente | O `uv` foi instalado com `pip install --user` e ficou fora do PATH: usar `python -m uv` ou adicionar `%APPDATA%\Python\Python314\Scripts` ao PATH. | Quando quiser |
| P-035 | 🟡 | ambiente | Nos projetos da nuvem, **desligar o provedor de e-mail** no painel do Supabase (Authentication → Providers → Email): login só com conta Microsoft. O `config.toml` deixa ligado só para o ambiente local/CI (usuários de teste). | Ao criar os projetos (P-022) |
| P-036 | ⚪ | ci | Ações do CI (`checkout@v4`, `setup-uv@v6`, `supabase/setup-cli@v1`) usam Node 20, descontinuado no GitHub: atualizar as versões quando saírem. | Quando quiser |
| P-038 | ⚪ | api | Sem limite de requisições por usuário (rate limit) na API: na Vercel não há onde guardar a contagem sem serviço extra. Avaliar no go-live as regras de firewall da Vercel (WAF) para a API. | Go-live |

## Resolvidas

| Código | Data | Como foi resolvido |
|---|---|---|
| P-015 | 2026-10-07 | O `supabase start` do job `banco` do CI roda com o provider Azure ligado usando valores falsos em `AZURE_*` (ver `.github/workflows/ci.yml`). Local, basta exportar as mesmas variáveis. |
| P-029 | 2026-10-07 | Decisão do dono: arrastar com o dedo. `@dnd-kit/core` com mouse, toque (segurar ~0,25 s) e teclado, rolagem automática na borda (ADR 0010). Testes: teclado (unitário) e mouse/toque (E2E). |
| P-026 | 2026-10-07 | Obsoleta: não existe mais previsão automática antes de enviar — o prazo é definido pela TI (ADR 0009). Rota `GET /categorias/{id}/previsao` removida. |
| P-010 | 2026-10-07 | Obsoleta: o prazo não depende mais da categoria (ADR 0009). Trocar a categoria não mexe no prazo. |
| P-037 | 2026-10-06 | Decisão do dono: não haverá "O que foi feito" ao concluir — o **Relato técnico** já cumpre esse papel. |
| P-005 | 2026-10-06 | Decisão do dono: integração Microsoft só para o login, e só `@dommainc.com.br` acessa. Migration 0018 (perfil fora do domínio nasce inativo) + login single-tenant e sessão limitada (`docs/go-live.md`, passo 5). Desligamento = bloquear no Microsoft; opcionalmente `ativo = false`. |
| P-009 | 2026-10-06 | Migration 0018: leituras do solicitante exigem perfil ativo (`app.eu_ativo()`, `app.eh_solicitante_do_chamado`). Teste `005`. |
| P-008 | 2026-10-06 | Decisão do dono: tela de Configurações (categorias, campos, SLA, feriados) fica para a **Fase 2**; até lá, SQL. Lembrete: cadastrar feriados de 2028 antes do fim de 2027. |
| P-014 | 2026-10-06 | Procedimento em `docs/go-live.md`, passo 3: `seed.sql` é idempotente e roda uma vez por `psql` em cada projeto; `seed.dev.sql` nunca na nuvem. |
| P-034 | 2026-10-06 | Validado no job `banco` do CI (Supabase local no runner): abrir, assumir, transferir, aguardar, nota interna, resposta automática, lido, concluir, cancelar, permissões e anexo (upload assinado → mover → download) passaram contra o banco real. Falta só repetir no projeto `dev` da nuvem. |
| P-023 | 2026-10-06 | Job `banco` do CI aplica as 17 migrations do zero e roda os 62 testes pgTAP a cada push. Ajustes nos testes: ids próprios no 001 (colidiam com o `seed.dev.sql`), `grant central_api` só na transação de teste (Postgres 17 não deixa o criador assumir o papel) e acesso ao pgTAP no 004. |
| P-028 | 2026-10-06 | Rotas criadas na API (`app/routers/chamados.py`, ADR 0008) com o contrato de `apps/web/lib/dados/tipos.ts`; testadas em memória. Validação com banco segue em P-034. |
| P-016 | 2026-10-06 | `supabase/seed.dev.sql` criado (4 usuários de teste, senha local do `central_api`) e incluído no `config.toml`. Não executado ainda (P-023). |
| P-013 | 2026-10-06 | Documentado em `docs/banco.md`: usuário com chamados não é apagado; desligamento = `ativo = false` (quem marca continua em P-005). |
| P-006 | 2026-10-05 | Técnico **pode** abrir chamado: a TI também vê o formulário de abertura (ajustar a nova 1A-3). |
| P-007 | 2026-10-05 | Resolver **não** grava mensagem automática no chat; o encerramento segue só pela mudança de status. |
| P-025 | 2026-10-05 | Mockup do dono (9 telas) virou `docs/ui-ux.md` + base visual no front. Adaptado ao ADR 0005; contato = telefone/celular. |
| P-024 | 2026-10-05 | ADR 0006: front usa `lib/dados/` com versão simulada (navegador) até existir banco; versão real depois da 1A-2. |
| P-019 | 2026-10-05 | Migration `20261005120000_status_simplificados.sql` + testes `002_status.test.sql`. Escrita, não executada (P-023). |
| P-011 | 2026-10-05 | `alter default privileges revoke execute on functions from public` na mesma migration (global: o Postgres não permite revogar por schema). Teste na `002`. |
| P-001 | 2026-10-05 | `git init` (branch `main`) + commit inicial; `.gitattributes` fixa quebra de linha LF. |
| P-020 | 2026-10-05 | Nova 1A-3 salva já com os 6 status; 1B/1C/1D receberam aviso de desatualizados. `escopo.md` continua como documento de origem (CLAUDE.md e ADRs prevalecem). |
| P-018 | 2026-10-05 | Status simplificados para 6 (`docs/adr/0005`). Concluído é final; técnico conclui mesmo sem resposta do solicitante; sem fechamento automático. |
| P-003 | 2026-10-05 | Qualquer técnico pode devolver um `transferido` à fila (ADR 0005). Alerta de parado virou P-021. |
| P-004 | 2026-10-05 | Devolver à fila limpa o responsável (ADR 0005). |
| P-012 | 2026-10-05 | Coberto pela migration de P-019 (checks dos novos status). |
| P-017 | 2026-10-05 | Aprovado: o `ci.yml` básico (1A-4) entra antes da 1A-3 Entrega 2. |
