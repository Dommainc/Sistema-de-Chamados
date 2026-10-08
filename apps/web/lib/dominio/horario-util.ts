// Prazo em horas úteis — espelho de app.adicionar_horas_uteis (migration 0002).
// Expediente seg–sex, 08:00–20:00 (configuracoes), sem feriados ativos.
// America/Sao_Paulo não tem horário de verão desde 2019: usamos o deslocamento fixo de -3 h.

const DESLOCAMENTO_SP_MS = -3 * 3_600_000;
const DIA_MS = 86_400_000;

export interface ExpedienteConfig {
  /** "08:00" */
  inicio: string;
  /** "20:00" */
  fim: string;
  /** Datas "AAAA-MM-DD" de feriados ativos. */
  feriados: ReadonlySet<string>;
}

function minutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Instante → "relógio de parede" de São Paulo, representado em ms UTC. */
const paraLocal = (utcMs: number) => utcMs + DESLOCAMENTO_SP_MS;
const paraUtc = (localMs: number) => localMs - DESLOCAMENTO_SP_MS;

function inicioDoDia(localMs: number): number {
  return Math.floor(localMs / DIA_MS) * DIA_MS;
}

export function ehDiaUtil(localMs: number, feriados: ReadonlySet<string>): boolean {
  const data = new Date(localMs);
  const diaSemana = data.getUTCDay(); // 0 = domingo
  return diaSemana >= 1 && diaSemana <= 5 && !feriados.has(data.toISOString().slice(0, 10));
}

/** Soma `horas` úteis a `inicio`. Ex.: sexta 17:00 + 2 h → segunda 09:00. */
export function adicionarHorasUteis(inicio: Date, horas: number, config: ExpedienteConfig): Date {
  if (horas <= 0) return new Date(inicio);
  const abreMin = minutos(config.inicio);
  const fechaMin = minutos(config.fim);

  let local = paraLocal(inicio.getTime());
  let restante = horas * 3_600_000;

  for (let guarda = 0; guarda < 3700; guarda++) {
    const dia = inicioDoDia(local);
    if (ehDiaUtil(dia, config.feriados)) {
      const abre = dia + abreMin * 60_000;
      const fecha = dia + fechaMin * 60_000;
      if (local < abre) local = abre;
      if (local < fecha) {
        const disponivel = fecha - local;
        if (restante <= disponivel) return new Date(paraUtc(local + restante));
        restante -= disponivel;
      }
    }
    local = dia + DIA_MS + abreMin * 60_000;
  }
  throw new Error("adicionarHorasUteis: sem dias úteis em 10 anos (verifique feriados/expediente)");
}

/**
 * Horas úteis entre dois instantes (Dashboard — ADR 0013). Ex.: sexta 17:00 → segunda 09:00 = 2 h.
 * `fim` antes de `inicio` = 0.
 */
export function horasUteisEntre(inicio: Date, fim: Date, config: ExpedienteConfig): number {
  const abreMin = minutos(config.inicio);
  const fechaMin = minutos(config.fim);
  const a = paraLocal(inicio.getTime());
  const b = paraLocal(fim.getTime());
  if (b <= a) return 0;

  let total = 0;
  for (let dia = inicioDoDia(a); dia <= b; dia += DIA_MS) {
    if (!ehDiaUtil(dia, config.feriados)) continue;
    const de = Math.max(a, dia + abreMin * 60_000);
    const ate = Math.min(b, dia + fechaMin * 60_000);
    if (ate > de) total += ate - de;
  }
  return total / 3_600_000;
}
