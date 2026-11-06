// Feriados 2026–2027 — cópia de supabase/seed.sql (o seed é a fonte da verdade).

import type { EscopoFeriado, FeriadoConfig } from "@/lib/dados/tipos";

const LINHAS: [data: string, nome: string, escopo: EscopoFeriado][] = [
  ["2026-01-01", "Confraternização Universal", "nacional"],
  ["2026-01-20", "São Sebastião", "municipal"],
  ["2026-02-16", "Carnaval", "ponto_facultativo"],
  ["2026-02-17", "Carnaval", "ponto_facultativo"],
  ["2026-04-03", "Paixão de Cristo", "nacional"],
  ["2026-04-21", "Tiradentes", "nacional"],
  ["2026-04-23", "São Jorge", "estadual"],
  ["2026-05-01", "Dia do Trabalho", "nacional"],
  ["2026-06-04", "Corpus Christi", "ponto_facultativo"],
  ["2026-09-07", "Independência do Brasil", "nacional"],
  ["2026-10-12", "Nossa Senhora Aparecida", "nacional"],
  ["2026-11-02", "Finados", "nacional"],
  ["2026-11-15", "Proclamação da República", "nacional"],
  ["2026-11-20", "Dia da Consciência Negra", "nacional"],
  ["2026-12-25", "Natal", "nacional"],
  ["2027-01-01", "Confraternização Universal", "nacional"],
  ["2027-01-20", "São Sebastião", "municipal"],
  ["2027-02-08", "Carnaval", "ponto_facultativo"],
  ["2027-02-09", "Carnaval", "ponto_facultativo"],
  ["2027-03-26", "Paixão de Cristo", "nacional"],
  ["2027-04-21", "Tiradentes", "nacional"],
  ["2027-04-23", "São Jorge", "estadual"],
  ["2027-05-01", "Dia do Trabalho", "nacional"],
  ["2027-05-27", "Corpus Christi", "ponto_facultativo"],
  ["2027-09-07", "Independência do Brasil", "nacional"],
  ["2027-10-12", "Nossa Senhora Aparecida", "nacional"],
  ["2027-11-02", "Finados", "nacional"],
  ["2027-11-15", "Proclamação da República", "nacional"],
  ["2027-11-20", "Dia da Consciência Negra", "nacional"],
  ["2027-12-25", "Natal", "nacional"],
];

/** Feriados de exemplo (a tela de Configurações do modo de demonstração começa com eles). */
export const FERIADOS_EXEMPLO: readonly FeriadoConfig[] = LINHAS.map(([data, nome, escopo]) => ({
  data,
  nome,
  escopo,
  ativo: true,
}));

export const FERIADOS_SIMULADOS: ReadonlySet<string> = new Set(LINHAS.map(([data]) => data));

export const EXPEDIENTE_SIMULADO = {
  inicio: "08:00",
  fim: "20:00", // expediente 8h–20h (pedido do dono, 2026-10-08)
  feriados: FERIADOS_SIMULADOS,
} as const;
