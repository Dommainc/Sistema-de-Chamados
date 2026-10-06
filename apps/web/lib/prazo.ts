// Situação do prazo (docs/ui-ux.md, "Prazo"): vencido · vence em menos de 1 h · no prazo · sem prazo.
// O prazo é definido por um técnico (docs/adr/0009): chamado novo nasce SEM prazo (null).

import { formatarQuando, maiuscula } from "@/lib/formato";

export type SituacaoPrazo = "vencido" | "vence_em_breve" | "no_prazo" | "sem_prazo";

/** "Perto de vencer" = menos de 1 hora (mockup). */
export const LIMITE_VENCE_EM_BREVE_MS = 60 * 60 * 1000;

export function situacaoPrazo(prazoIso: string | null, agora: Date = new Date()): SituacaoPrazo {
  if (prazoIso === null) return "sem_prazo";
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

/** "Venceu há 3 h" · "Vence em 50 min" · "Hoje, 11:30" · "Amanhã, 17:00" · "13/10, 09:00" · "Sem prazo". */
export function textoPrazo(prazoIso: string | null, agora: Date = new Date()): string {
  if (prazoIso === null) return "Sem prazo";
  const restante = new Date(prazoIso).getTime() - agora.getTime();
  switch (situacaoPrazo(prazoIso, agora)) {
    case "sem_prazo":
      return "Sem prazo";
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

/**
 * Ordem da fila e das colunas (ADR 0009): primeiro os que têm prazo, do mais próximo ao mais distante;
 * depois os sem prazo, do mais antigo ao mais novo (quem espera há mais tempo vem antes).
 */
export function compararPrazo(
  a: { prazoSla: string | null; criadoEm: string },
  b: { prazoSla: string | null; criadoEm: string },
): number {
  if (a.prazoSla && b.prazoSla) return a.prazoSla.localeCompare(b.prazoSla);
  if (a.prazoSla) return -1;
  if (b.prazoSla) return 1;
  return a.criadoEm.localeCompare(b.criadoEm);
}

// ------------------------------------------------------------------ prazo definido pela TI (ADR 0009)
// São Paulo não tem horário de verão desde 2019: deslocamento fixo de -3 h (como lib/dominio/horario-util).
const DESLOCAMENTO_SP_MS = -3 * 3_600_000;
const DIA_MS = 86_400_000;

/** ISO → valor do campo `datetime-local`, no horário de São Paulo ("2026-10-08T18:00"). */
export function paraCampoDataHora(iso: string): string {
  return new Date(new Date(iso).getTime() + DESLOCAMENTO_SP_MS).toISOString().slice(0, 16);
}

/** Valor do campo `datetime-local` (horário de São Paulo) → ISO em UTC; null se vazio ou inválido. */
export function doCampoDataHora(valor: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) return null;
  const data = new Date(`${valor}:00-03:00`);
  return Number.isNaN(data.getTime()) ? null : data.toISOString();
}

export interface AtalhoPrazo {
  rotulo: string;
  iso: string;
}

/**
 * Atalhos da janela "Definir prazo": Hoje 18h (se ainda não passou), Amanhã 12h, Amanhã 18h e
 * Em 3 dias úteis (18h). Os dias úteis pulam sábado e domingo; feriados o técnico ajusta no campo.
 */
export function atalhosPrazo(agora: Date = new Date()): AtalhoPrazo[] {
  const hojeLocal = Math.floor((agora.getTime() + DESLOCAMENTO_SP_MS) / DIA_MS) * DIA_MS;
  const as = (diaLocal: number, hora: number) =>
    new Date(diaLocal + hora * 3_600_000 - DESLOCAMENTO_SP_MS);
  let diaUtil = hojeLocal;
  for (let contados = 0; contados < 3;) {
    diaUtil += DIA_MS;
    const semana = new Date(diaUtil).getUTCDay();
    if (semana >= 1 && semana <= 5) contados++;
  }
  const atalhos: { rotulo: string; data: Date }[] = [
    { rotulo: "Hoje 18h", data: as(hojeLocal, 18) },
    { rotulo: "Amanhã 12h", data: as(hojeLocal + DIA_MS, 12) },
    { rotulo: "Amanhã 18h", data: as(hojeLocal + DIA_MS, 18) },
    { rotulo: "Em 3 dias úteis", data: as(diaUtil, 18) },
  ];
  return atalhos
    .filter((a) => a.data.getTime() > agora.getTime())
    .map((a) => ({ rotulo: a.rotulo, iso: a.data.toISOString() }));
}
