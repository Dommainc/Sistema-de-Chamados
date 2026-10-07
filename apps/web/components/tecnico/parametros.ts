// Parâmetros da URL da área técnica (filtros compartilháveis por link).
// A área técnica tem só o quadro (kanban) — decisão do dono em 2026-10-06, sem modo "Lista".

import type { ColunaQuadro } from "./quadro";

/** "Pessoa atendendo": qualquer pessoa, eu, ninguém ainda, ou o id de um técnico. */
export type FiltroResponsavel = "todos" | "meus" | "sem_responsavel" | (string & {});

export type FiltroPrazoUrl = "todos" | "vencido" | "vence_em_breve" | "no_prazo" | "sem_prazo";

export function lerPrazo(valor: string | null | undefined): FiltroPrazoUrl {
  return valor === "vencido" ||
    valor === "vence_em_breve" ||
    valor === "no_prazo" ||
    valor === "sem_prazo"
    ? valor
    : "todos";
}

export function lerCategoria(valor: string | null | undefined): number | null {
  return valor && /^\d+$/.test(valor) ? Number(valor) : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function lerFiltro(valor: string | null | undefined): FiltroResponsavel {
  if (valor === "meus" || valor === "sem_responsavel") return valor;
  return valor && UUID.test(valor) ? valor.toLowerCase() : "todos";
}

const COLUNAS_VALIDAS: readonly ColunaQuadro[] = [
  "novos",
  "transferidos",
  "em_atendimento",
  "aguardando",
  "concluidos",
  "cancelados",
];

/** Filtro "Status": mostra só a coluna escolhida (null = todas). */
export function lerStatus(valor: string | null | undefined): ColunaQuadro | null {
  return COLUNAS_VALIDAS.find((c) => c === valor) ?? null;
}

/**
 * Busca da barra: só dígitos ("42" ou "#42") abre o chamado direto;
 * texto filtra os cartões do quadro pelo título. Vazio não faz nada.
 */
export function destinoBusca(texto: string): string | null {
  const limpo = texto.trim();
  if (!limpo) return null;
  const numero = limpo.replace(/^#/, "");
  if (/^\d+$/.test(numero)) return `/atendimento/${Number(numero)}`;
  return `/atendimento?busca=${encodeURIComponent(limpo)}`;
}
