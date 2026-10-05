# Central de Chamados — DOMMA Incorporações

Sistema novo e independente de chamados de suporte da TI. Substitui o processo antigo
(Microsoft Lists + SharePoint + Power Automate), **sem nenhuma integração com eles**.

## Como trabalhar neste repositório

1. Cada sessão executa **uma etapa** de `docs/fases/`. Leia o arquivo da etapa, `docs/fases/STATUS.md` e, quando citado, `docs/escopo.md`.
2. **Antes de escrever código**, apresente o plano da etapa (arquivos, migrations, decisões) e espere aprovação.
3. Ao terminar: liste o que foi feito, o que ficou pendente e como testar, e atualize `docs/fases/STATUS.md`.
4. Decisão nova de arquitetura → registre em `docs/adr/NNNN-titulo.md`.
5. Em dúvida sobre regra de negócio, **pergunte** em vez de assumir.
6. **Documentação viva** — a cada mudança, na mesma sessão:
   - problema encontrado ou decisão em aberto → novo item em `docs/pendencias.md` (`P-NNN`); resolvido → mover para "Resolvidas" com data;
   - qualquer alteração no projeto → uma linha no "Registro de mudanças" de `docs/fases/STATUS.md`.

## Stack

| Camada | Tecnologia |
|---|---|
| Front | Next.js (App Router) + TypeScript strict + Tailwind — `apps/web` |
| Back | FastAPI (Python 3.12) + asyncpg + Pydantic v2 — `apps/api` |
| Banco / Auth / Realtime / Storage | Supabase — `supabase/` (local via Docker; nuvem em `sa-east-1` depois) |
| Login | Microsoft Entra ID (provider Azure do Supabase) |
| Avisos | Bot do Teams **já existente** (projeto separado), via endpoint `POST /notificar` |
| Hospedagem | Vercel: dois projetos (web e api), região `gru1` |

## Regras que nunca podem ser quebradas

- **Integrações permitidas:** só login Entra ID e bot do Teams. Nada de Graph para outros fins, Lists, SharePoint ou Power Automate.
- **Interface 100% em português do Brasil**, linguagem simples (público não técnico).
- **Segurança no banco:** RLS em todas as tabelas. Nunca confiar só no front.
- **Front só acessa dados por `apps/web/lib/dados/`** (`docs/adr/0006`): versão `simulada` (atual, sem banco) ou `real`.
  A versão simulada nunca vai para produção.
- **Modelo de leitura/escrita** (`docs/adr/0002`):
  - front lê direto do Supabase com a `anon key` (RLS filtra);
  - toda ação de negócio passa pela FastAPI;
  - FastAPI **lê** como o usuário (`set local role authenticated` + claims do JWT) e **grava** como `central_api` (`reset role`), numa única transação;
  - `service_role` só na FastAPI, apenas para Storage e jobs. **Nunca** no front.
- **Migrations:** nunca editar uma migration já commitada; sempre criar nova (`supabase migration new`). Tabela nova exige `enable row level security` + GRANT + policy explícitos (os defaults do Supabase foram revogados) + teste em `supabase/tests/database/`.
- **Sem segredos no código.** `.env` no `.gitignore`; `.env.example` sem valores; inventário em `docs/segredos.md`.
- **Falha no Teams nunca bloqueia a ação.** Notificação é gravada como `pendente` (outbox, `docs/adr/0003`).
- **Erros:** sempre pelo catálogo central (`apps/api/app/erros/catalogo.py` ↔ `apps/web/lib/erros/catalogo.ts`). Nunca mostrar stack trace, SQL ou mensagem crua do Supabase.

## Domínio

### Papéis
- `solicitante` (padrão): abre e acompanha **só os próprios** chamados, no portal (`/`, `/meus-chamados`).
- `ti`: vê e atende **todos**, escreve notas internas e também abre chamado, na área técnica (`/atendimento`).
  Configurações (categorias, formulários, SLA, feriados) ficam para depois da Fase 1: por ora, só por migration/SQL.
- O papel vem do grupo `Central-Chamados-TI` no Entra (claim `groups`), sincronizado a cada login. Não é editável na Central.
- As duas áreas são separadas na interface (`docs/fases/1A-3-experiencia-por-perfil.md`); a segurança continua no RLS e na API.

### Número do chamado
`chamados.id` = `bigint generated always as identity` (1, 2, 3...). Exibir como **"Chamado 42"** ou **"#42"**.
Link universal `/chamados/42` (usado no Teams) redireciona para `/meus-chamados/42` (solicitante) ou `/atendimento/42` (TI).
Busca por `42` na fila abre direto.

### Máquina de estados (fonte única: `apps/api/app/dominio/estados.py`; decisão em `docs/adr/0005`)

6 status: `pendente`, `em_andamento`, `aguardando_usuario`, `transferido`, `concluido`, `cancelado`.
Aplicado no banco pela migration `20261005120000_status_simplificados.sql`.

| De | Para | Quem | Exige |
|---|---|---|---|
| pendente | em_andamento | TI (assumir) | responsável = quem assumiu |
| pendente | cancelado | solicitante ou TI | motivo |
| em_andamento | aguardando_usuario | TI | — (SLA pausa na Fase 2) |
| aguardando_usuario | em_andamento | solicitante responde no chat (automático) ou TI | — |
| em_andamento, aguardando_usuario | transferido | TI | destino técnico + motivo |
| em_andamento, aguardando_usuario, transferido | pendente | TI (devolver à fila) | motivo; limpa o responsável |
| transferido | em_andamento | técnico de destino (assumir) | — |
| em_andamento, aguardando_usuario | concluido | TI | — (inclusive sem resposta do solicitante) |
| em_andamento, aguardando_usuario, transferido | cancelado | TI | motivo |
| concluido, cancelado | — | ninguém | terminal, somente leitura |

Não há confirmação, reabertura nem fechamento automático: se o problema voltar, o solicitante abre um novo chamado.
Solicitante tentando cancelar fora de `pendente` → `CANCELAMENTO_NAO_PERMITIDO`.
Toda transição grava `historico` + `notificacoes` (pendente) na mesma transação.

### Erros do banco (SQLSTATE próprios → catálogo)
`CC001` encerrado/somente leitura → `TRANSICAO_INVALIDA` · `CC002` campo imutável · `CC003` exclusão proibida ·
`CC004` categoria inativa · `CC005` sem permissão → `SEM_PERMISSAO` · `CC006` inconsistência · `42501` → `SEM_PERMISSAO` ·
`23514` (check) → mapear pelo nome da constraint.

### Anexos
Bucket privado `anexos`. Fluxo: API valida → devolve **URL assinada de upload** para `temporarios/{usuario_id}/...` →
navegador envia direto ao Storage (limite de 4,5 MB do corpo na Vercel) → ao criar o chamado/mensagem, a API confere o
arquivo, move para `chamados/{id}/{uuid}-{nome}` e grava em `anexos`.
Colar imagem (Ctrl+V) gera `print-AAAAMMDD-HHMMSS.png` com `origem = 'colado'`.

## Convenções

- Nomes de domínio em português (`chamado`, `solicitante`, `transferir`); código técnico pode ser em inglês.
- Python: `ruff` (lint + format), `pytest` + `pytest-asyncio`, tipagem em tudo.
- TypeScript: `strict`, ESLint + Prettier, sem `any`.
- Datas: armazenar em UTC, exibir em `America/Sao_Paulo` (`dd/MM/yyyy HH:mm`).
- Commits: Conventional Commits em português (`feat(chamados): permite cancelar com motivo`).

## Comandos

```bash
supabase start            # banco local (Docker) + migrations + seed
supabase db reset         # recria do zero
supabase test db          # testes pgTAP do banco
supabase migration new nome_da_mudanca

cd apps/api && uv run fastapi dev app/main.py   # http://localhost:8000/docs
cd apps/api && uv run pytest
cd apps/web && pnpm dev                          # http://localhost:3000 (dados simulados, ADR 0006)
cd apps/web && pnpm lint && pnpm typecheck && pnpm test
```

## Desenvolvimento local sem Entra ID

Enquanto o App Registration não existe, o ambiente **local** tem login por e-mail/senha com 3 usuários de teste
(ver `supabase/seed.dev.sql`): `ana@teste.local` e `bruno@teste.local` (solicitantes) e `tec@teste.local` (TI),
senha `teste123`. O botão só aparece com `NEXT_PUBLIC_LOGIN_DEV=true` e **nunca** pode existir em produção.
