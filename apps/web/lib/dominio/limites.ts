// Limites de caracteres (dono, 2026-10-23). Espelho: apps/api/app/dominio/limites.py.

/** "Resumo do problema" (vira chamados.titulo). */
export const TITULO_MAX = 100;
/** Campos de texto longo do formulário (ex.: "Descreva o que está acontecendo"). */
export const TEXTO_LONGO_MAX = 2000;
/** Cada mensagem do chat. */
export const MENSAGEM_MAX = 2000;
/** Motivo de cancelar, transferir ou mudar o prazo. */
export const MOTIVO_MAX = 500;

/** 2000 → "2.000". */
export function numeroBr(n: number): string {
  return n.toLocaleString("pt-BR");
}
