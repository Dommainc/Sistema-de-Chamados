// Situação do prazo (docs/ui-ux.md, "Prazo"): vencido · vence em menos de 1 h · no prazo.

import { formatarQuando, maiuscula } from "@/lib/formato";

export type SituacaoPrazo = "vencido" | "vence_em_breve" | "no_prazo";

/** "Perto de vencer" = menos de 1 hora (mockup). */
export const LIMITE_VENCE_EM_BREVE_MS = 60 * 60 * 1000;

export function situacaoPrazo(prazoIso: string, agora: Date = new Date()): SituacaoPrazo {
  const restante = new Date(prazoIso).getTime() - agora.getTime();
  if (restante < 0) return "vencido";
  if (restante < LIMITE_VENCE_EM_BREVE_MS) return "vence_em_breve";
  return "no_prazo";
}

function duracao(ms: number): string {
  const minutos = Math.max(1, Math.floor(ms / 60_000));
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? "1 dia" : `${dias} dias`;
}

/** "Venceu há 3 h" · "Vence em 50 min" · "Hoje, 11:30" · "Amanhã, 17:00" · "13/10, 09:00". */
export function textoPrazo(prazoIso: string, agora: Date = new Date()): string {
  const restante = new Date(prazoIso).getTime() - agora.getTime();
  switch (situacaoPrazo(prazoIso, agora)) {
    case "vencido":
      return `Venceu há ${duracao(-restante)}`;
    case "vence_em_breve":
      return `Vence em ${duracao(restante)}`;
    case "no_prazo":
      return maiuscula(formatarQuando(prazoIso, agora));
  }
}

/** Fração do tempo já consumido entre a abertura e o prazo (0 a 1), para a barra fina. */
export function progressoPrazo(
  criadoIso: string,
  prazoIso: string,
  agora: Date = new Date(),
): number {
  const inicio = new Date(criadoIso).getTime();
  const fim = new Date(prazoIso).getTime();
  if (fim <= inicio) return 1;
  return Math.min(1, Math.max(0, (agora.getTime() - inicio) / (fim - inicio)));
}
