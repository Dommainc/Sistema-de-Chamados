# Etapa 2A — Configurações pela tela da TI

**Decisão:** `docs/adr/0022-configuracoes-pela-tela.md` · **Pedido do dono:** 2026-11-06 · **Resolve:** P-008

## Objetivo
A TI muda pela Central o que antes era só por SQL: opções dos formulários (sistemas com cor, módulos do Sienge e do
CVCRM, itens de Infraestrutura, programas da Microsoft), assuntos da tela inicial, respostas prontas do chat,
feriados e o horário do expediente. Toda mudança fica registrada com o nome de quem fez.

## Entregas
| # | Parte | Onde |
|---|---|---|
| 1 | Banco: `config_alteracoes`, API grava `respostas_prontas`, TI lê as desativadas | migration 0037, pgTAP 022 (010 ajustado) |
| 2 | API: `PATCH/POST /configuracoes/...` (só TI, grava + registra numa transação) | `apps/api/app/routers/configuracoes.py`, `app/dominio/configuracoes.py` |
| 3 | Front: `FonteDeDados` (simulada e real) + tela com 4 abas e "Últimas alterações" | `lib/dados/*/configuracoes.ts`, `components/tecnico/configuracoes/` |
| 4 | Docs: ADR 0022, `docs/api.md`, `docs/banco.md`, `docs/erros.md`, Guia da TI | — |

## Regras
- Só a TI. Nada é apagado (desativar). Renomear não reescreve chamados antigos.
- Opção que abre outra pergunta (Sienge, CVCRM) não sai da lista; renomeada, a pergunta do módulo vai junto.
- Nome repetido (ignorando maiúsculas) é recusado em opções, assuntos e respostas prontas.
- Expediente: HH:MM, fim depois do início; vale na hora para prazos, Dashboard e automações.

## Como testar
1. `cd apps/web && pnpm dev` (modo de demonstração) → entrar como Rafael Lima → menu do nome → **Painel**.
2. **Formulários:** renomeie KickIn/Quickin, adicione um sistema com cor, retire outro, veja "O que vai mudar" e
   salve. Abra um chamado em "Solicitações de acesso" como Ana: a lista nova aparece.
3. **Assuntos:** desative "Microsoft" → some da tela inicial da Ana; reative.
4. **Respostas prontas:** crie uma e veja no botão "Respostas prontas" do chat; desative e ela some.
5. **Feriados e expediente:** cadastre um feriado de 2028; mude o expediente para 07:00–19:00.
6. Banco: `supabase test db` (pgTAP 022) e `cd apps/api && uv run pytest -m banco` (com banco).

## Fora do escopo
Criar perguntas novas (campos) num assunto, mudar o tipo de uma pergunta e prazos por assunto (`sla_horas`, que
deixou de ser usado no ADR 0009) continuam por migration.
