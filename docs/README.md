# Central de Chamados — DOMMA Incorporações

Sistema de chamados de suporte da TI: o colaborador abre e acompanha pedidos; a TI atende num quadro (kanban),
conversa pelo chat e recebe avisos no Teams. Substitui o processo antigo (Lists + SharePoint + Power Automate),
**sem integração com ele**.

## Situação atual (outubro/2026)

| Parte | Situação |
|---|---|
| Front (`apps/web`) | ✅ Completo em **modo de demonstração** (dados simulados no navegador, [ADR 0006](adr/0006-front-com-dados-simulados.md)) |
| Banco (`supabase/`) | ✅ 18 migrations, seeds e 71 testes pgTAP **rodando no CI** (Supabase local no runner) · ⏳ nuvem aguarda a assinatura do Supabase |
| API (`apps/api`) | ✅ Rotas prontas e testadas contra banco real no CI ([api.md](api.md)) · ⏳ camada `real` do front e nuvem aguardam o Supabase ([go-live.md](go-live.md)) |
| Avisos no Teams | ⏳ Etapa 1E (depende do bot existente) |

Detalhe por etapa: [fases/STATUS.md](fases/STATUS.md) · Pendências e decisões abertas: [pendencias.md](pendencias.md).

## Documentos

| Documento | Para quê |
|---|---|
| [../CLAUDE.md](../CLAUDE.md) | Regras do projeto (stack, segurança, convenções) — leitura obrigatória |
| [escopo.md](escopo.md) | Documento de origem (o CLAUDE.md e os ADRs prevalecem) |
| [arquitetura.md](arquitetura.md) | Como as peças se conectam |
| [banco.md](banco.md) | Tabelas, regras de acesso (RLS) e dicionário de dados |
| [status.md](status.md) | Ciclo de vida do chamado (6 status) |
| [api.md](api.md) | Rotas da API, exemplos e erros de cada uma |
| [erros.md](erros.md) | Catálogo de mensagens de erro |
| [segredos.md](segredos.md) | Inventário de chaves e senhas (sem valores) |
| [ui-ux.md](ui-ux.md) | Especificação visual (mockup oficial) |
| [guia-usuario.md](guia-usuario.md) | Guia de 1 página para quem usa |
| [fases/revisao-fase1.md](fases/revisao-fase1.md) | **O que está pronto e o que falta para ir ao ar** (pré-revisão da Fase 1) |
| [go-live.md](go-live.md) | Roteiro para colocar no ar (dia da assinatura do Supabase) |
| [runbooks/](runbooks/) | Passo a passo para operação (backup, troca de chave, bot parado) |
| [adr/](adr/) | Decisões de arquitetura |
| [fases/](fases/) | Etapas de construção |

## Rodar no computador

### Pré-requisitos
- **Node.js 20+** e **pnpm** (`npm install -g pnpm`)
- Para a API: **uv** (`pip install uv`) — ele instala o Python 3.12 do projeto
- Para o banco local (quando o Supabase estiver liberado): **Docker Desktop** e **Supabase CLI**

### Front em modo de demonstração (não precisa de banco)
```bash
cd apps/web
pnpm install
pnpm dev            # http://localhost:3000 — entre como Ana, Bruno (solicitantes), Rafael ou Thiago (TI)
```
Os dados ficam só no navegador; "Restaurar dados de exemplo" (faixa amarela) volta ao início.

### Verificações
```bash
cd apps/web && pnpm lint && pnpm typecheck && pnpm test && pnpm build
cd apps/web && pnpm e2e          # testes no navegador (Playwright)
cd apps/web && pnpm prints       # prints das telas em docs/guia/img
cd apps/api && uv run ruff check && uv run pytest
```

### Banco local (depois da liberação do Supabase)
```bash
supabase start          # sobe Postgres, Auth, Storage e Realtime no Docker + migrations + seed
supabase test db        # testes do banco (pgTAP)
supabase db reset       # recria do zero
```

### Variáveis de ambiente
Cada app tem um `.env.example` comentado e **sem valores** (`apps/web/.env.example`, `apps/api/.env.example`).
Copie para `.env.local` (web) / `.env` (api) e preencha. **Nunca** commite valores reais — veja [segredos.md](segredos.md).

## Configurações do GitHub (fazer à mão, uma vez)

Em **Dommainc/Sistema-de-Chamados → Settings**:
- [ ] **Code security → Secret scanning** e **Push protection**: ligados (bloqueia commit com chave).
- [ ] **Branches → Branch protection** na `main`: exigir o check **CI** e pull request (quando houver mais de uma pessoa).
- [ ] **Organização Dommainc → Authentication security**: exigir **2FA** de todos.
- [ ] Tokens de acesso: só **fine-grained**, com validade e acesso apenas a este repositório.
- [ ] **Environments** `dev` e `prod` (para o deploy de migrations): `prod` com aprovação obrigatória (detalhes em [go-live.md](go-live.md), passo 9).
