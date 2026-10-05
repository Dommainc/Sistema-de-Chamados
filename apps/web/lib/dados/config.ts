// Qual implementação da camada de dados está ativa (ADR 0006).
// O next.config.ts impede "simulada" no build de produção.

export type ModoFonteDados = "simulada" | "real";

export const FONTE_DADOS: ModoFonteDados =
  process.env.NEXT_PUBLIC_FONTE_DADOS === "real" ? "real" : "simulada";
