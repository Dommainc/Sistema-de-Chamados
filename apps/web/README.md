# Central de Chamados — front (`apps/web`)

Next.js 16 (App Router) + TypeScript strict + Tailwind 4 + Vitest. Regras gerais no `CLAUDE.md` da raiz.

## Rodar

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Sem `.env.local`, roda com **dados simulados** (`docs/adr/0006`): entre como Ana, Bruno (solicitantes) ou Técnico (TI).
Os dados ficam só no navegador; "Restaurar dados de exemplo" na faixa amarela volta ao início.

## Verificar

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## Onde fica cada coisa

| Pasta | Conteúdo |
|---|---|
| `app/(solicitante)/` | Portal do solicitante (`/`, `/meus-chamados`) |
| `app/(tecnico)/` | Área técnica (`/atendimento`) |
| `app/chamados/[id]/route.ts` | Link universal `/chamados/42` |
| `proxy.ts` + `lib/rotas.ts` | Quem pode abrir cada área |
| `lib/dados/` | Camada de dados (`simulada` hoje, `real` depois) — única porta de acesso a dados |
| `lib/erros/catalogo.ts` | Catálogo de erros (espelho da API) |
| `lib/status.ts`, `lib/formato.ts` | Rótulos de status por perfil, datas e números |
| `components/ui/` | Botao, Campo, Card, Modal, Toast, BadgeStatus |
| `app/globals.css` | Tokens de cor (provisórios até o padrão do Cadastro de Insumos) |
