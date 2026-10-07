// Arrastar cartões no quadro com mouse, dedo e teclado (docs/adr/0010, P-029) — sensores do dnd-kit.
// As regras de cada movimento continuam em quadro.ts (acaoDoArraste).

import {
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  type Announcements,
  type CollisionDetection,
  type KeyboardCoordinateGetter,
  type ScreenReaderInstructions,
} from "@dnd-kit/core";
import type { KeyboardEvent, MouseEvent, TouchEvent } from "react";
import { formatarNumeroChamado } from "@/lib/formato";
import { COLUNAS, type ColunaQuadro } from "./quadro";

/** O que vai junto com o cartão arrastado. */
export interface DadosArraste {
  chamadoId: number;
  coluna: ColunaQuadro;
}

/** Arrastar não começa em cima de um botão (ex.: "Iniciar"): ali o toque/clique é do botão. */
function emBotao(alvo: EventTarget | null): boolean {
  return alvo instanceof Element && alvo.closest("button") !== null;
}

/** Mouse: arrasta depois de mexer 6 px — o clique no título continua abrindo o chamado. */
export class SensorMouse extends MouseSensor {
  static activators = [
    {
      eventName: "onMouseDown" as const,
      handler: ({ nativeEvent }: MouseEvent) =>
        nativeEvent.button === 0 && !emBotao(nativeEvent.target),
    },
  ];
}

/** Dedo: segurar ~0,25 s e arrastar. Toque curto abre o chamado; deslizar rola a tela. */
export class SensorToque extends TouchSensor {
  static activators = [
    {
      eventName: "onTouchStart" as const,
      handler: ({ nativeEvent }: TouchEvent) =>
        nativeEvent.touches.length === 1 && !emBotao(nativeEvent.target),
    },
  ];
}

/**
 * Teclado: com o FOCO NO CARTÃO, espaço pega e solta, setas movem, Esc cancela.
 * Ignora teclas vindas do link ou do botão de dentro do cartão (Enter no título abre o chamado).
 */
export class SensorTeclado extends KeyboardSensor {
  static activators = [
    {
      eventName: "onKeyDown" as const,
      handler: (evento: KeyboardEvent) => {
        if (evento.target !== evento.currentTarget || evento.code !== "Space") return false;
        evento.preventDefault();
        return true;
      },
    },
  ];
}

export const OPCOES_MOUSE = { activationConstraint: { distance: 6 } };
export const OPCOES_TOQUE = { activationConstraint: { delay: 250, tolerance: 8 } };

const tituloColuna = (id: unknown) =>
  COLUNAS.find((c) => c.id === id)?.titulo ?? "fora das colunas";
const numero = (dados: unknown) =>
  formatarNumeroChamado((dados as DadosArraste | undefined)?.chamadoId ?? 0);

/** Avisos para leitor de tela — em português (a biblioteca vem em inglês). */
export const AVISOS: Announcements = {
  onDragStart: ({ active }) =>
    `Chamado ${numero(active.data.current)} pego. Use as setas para levar a outra coluna, espaço para soltar ou Esc para cancelar.`,
  onDragOver: ({ active, over }) =>
    over
      ? `Chamado ${numero(active.data.current)} sobre a coluna ${tituloColuna(over.id)}.`
      : `Chamado ${numero(active.data.current)} fora das colunas.`,
  onDragEnd: ({ active, over }) =>
    over
      ? `Chamado ${numero(active.data.current)} solto em ${tituloColuna(over.id)}.`
      : `Chamado ${numero(active.data.current)} solto fora das colunas. Nada mudou.`,
  onDragCancel: ({ active }) =>
    `Movimento do chamado ${numero(active.data.current)} cancelado. Nada mudou.`,
};

export const INSTRUCOES: ScreenReaderInstructions = {
  draggable:
    "Para mover este chamado de coluna, aperte espaço. Use as setas para escolher a coluna, espaço para soltar ou Esc para cancelar.",
};

/**
 * Teclado: seta para a direita/esquerda leva o cartão direto para o centro da próxima coluna
 * (o padrão do dnd-kit anda 25 px por tecla — seriam ~12 toques por coluna).
 */
export const pularColuna: KeyboardCoordinateGetter = (evento, { context }) => {
  const { collisionRect, droppableRects, droppableContainers } = context;
  const direcao = evento.code === "ArrowRight" ? 1 : evento.code === "ArrowLeft" ? -1 : 0;
  if (!collisionRect || direcao === 0) return undefined;
  evento.preventDefault();
  const centro = collisionRect.left + collisionRect.width / 2;
  const alvo = droppableContainers
    .getEnabled()
    .map((c) => droppableRects.get(c.id))
    .filter((r): r is NonNullable<typeof r> => r !== undefined)
    .filter((r) => (direcao > 0 ? r.left > centro : r.left + r.width < centro))
    .sort((a, b) => (direcao > 0 ? a.left - b.left : b.left - a.left))[0];
  if (!alvo) return undefined;
  return { x: alvo.left + (alvo.width - collisionRect.width) / 2, y: collisionRect.top };
};

/** Mouse e dedo: a coluna sob o ponteiro; teclado (sem ponteiro): a coluna que o cartão cobre. */
export const colisao: CollisionDetection = (args) => {
  const sobPonteiro = pointerWithin(args);
  return sobPonteiro.length > 0 ? sobPonteiro : rectIntersection(args);
};
