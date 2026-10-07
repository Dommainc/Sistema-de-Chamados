# ADR 0010 — Arrastar cartões do quadro com dnd-kit (mouse, dedo e teclado)

**Status:** aceito · **Data:** 2026-10-07 · **Resolve:** P-029

## Contexto
O quadro da TI usava o arrastar nativo do navegador (HTML5 drag and drop), que **só funciona com mouse**. No
celular e no tablet a TI dependia do botão "Assumir" e das ações da tela do chamado. O dono escolheu **arrastar com
o dedo** (2026-10-07). No celular as colunas não cabem na tela, então a tela precisa rolar sozinha ao levar o cartão
até a borda.

## Decisão
Usar **`@dnd-kit/core`** (leve, sem dependências, mantido, bem testado em React) no lugar do arrastar nativo.
Arquivos: `apps/web/components/tecnico/arraste.ts` (sensores, avisos, teclado), `ColunaQuadro.tsx`
(`useDraggable`/`useDroppable`) e `QuadroAtendimento.tsx` (`DndContext`, "fantasma" com `DragOverlay`).

| Entrada | Como começa | Detalhes |
|---|---|---|
| Mouse | Depois de mexer 6 px | Clique no título continua abrindo o chamado |
| Dedo | Segurar ~0,25 s | Toque curto abre o chamado; deslizar rola a tela |
| Teclado | Foco no cartão + **espaço** | Setas pulam de coluna em coluna; espaço solta; Esc cancela |

- Nunca começa em cima de um **botão** (ex.: "Assumir").
- **Rolagem automática** só nos 10% da borda e devagar (`acceleration: 4`); o "encaixe" das colunas (snap) é
  desligado durante o arraste, senão briga com a rolagem.
- Os cartões continuam com papel `article` (busca e leitores de tela); os avisos da biblioteca (em inglês) foram
  **traduzidos** ("Chamado #41 pego. Use as setas…").
- As **regras** não mudaram: `acaoDoArraste` (quadro.ts) decide o que cada movimento faz; Concluídos pede
  confirmação e Cancelados pede o motivo.

## Consequências
- Uma dependência a mais no front (`@dnd-kit/core`).
- Testes: o arraste pelo teclado roda nos testes unitários (com layout simulado, porque o jsdom não calcula
  posições); mouse e dedo rodam nos testes no navegador (`e2e/arrastar.spec.ts`, toque real via eventos touch).
