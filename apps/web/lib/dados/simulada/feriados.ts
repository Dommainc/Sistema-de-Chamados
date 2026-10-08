// Feriados ativos 2026–2027 — cópia de supabase/seed.sql (o seed é a fonte da verdade).

export const FERIADOS_SIMULADOS: ReadonlySet<string> = new Set([
  "2026-01-01",
  "2026-01-20",
  "2026-02-16",
  "2026-02-17",
  "2026-04-03",
  "2026-04-21",
  "2026-04-23",
  "2026-05-01",
  "2026-06-04",
  "2026-09-07",
  "2026-10-12",
  "2026-11-02",
  "2026-11-15",
  "2026-11-20",
  "2026-12-25",
  "2027-01-01",
  "2027-01-20",
  "2027-02-08",
  "2027-02-09",
  "2027-03-26",
  "2027-04-21",
  "2027-04-23",
  "2027-05-01",
  "2027-05-27",
  "2027-09-07",
  "2027-10-12",
  "2027-11-02",
  "2027-11-15",
  "2027-11-20",
  "2027-12-25",
]);

export const EXPEDIENTE_SIMULADO = {
  inicio: "08:00",
  fim: "20:00", // expediente 8h–20h (pedido do dono, 2026-10-08)
  feriados: FERIADOS_SIMULADOS,
} as const;
