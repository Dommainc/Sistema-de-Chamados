// Parâmetros da URL da área técnica (filtros compartilháveis por link).

import type { EscopoChamados } from "@/lib/dados/tipos";

export type ModoAtendimento = "quadro" | "lista";
export type FiltroResponsavel = "todos" | "meus" | "sem_responsavel";

/** O quadro é a visão padrão (mockup, tela 6). */
export function lerModo(valor: string | null | undefined): ModoAtendimento {
  return valor === "lista" ? "lista" : "quadro";
}

export type FiltroPrazoUrl = "todos" | "vencido" | "vence_em_breve" | "no_prazo";

export function lerPrazo(valor: string | null | undefined): FiltroPrazoUrl {
  return valor === "vencido" || valor === "vence_em_breve" || valor === "no_prazo"
    ? valor
    : "todos";
}

export function lerCategoria(valor: string | null | undefined): number | null {
  return valor && /^\d+$/.test(valor) ? Number(valor) : null;
}

export function lerFiltro(valor: string | null | undefined): FiltroResponsavel {
  return valor === "meus" || valor === "sem_responsavel" ? valor : "todos";
}

export const ESCOPO_DO_FILTRO: Record<FiltroResponsavel, EscopoChamados> = {
  todos: "todos",
  meus: "meus_atendimentos",
  sem_responsavel: "fila",
};

/**
 * Busca da barra: só dígitos ("42" ou "#42") abre o chamado direto;
 * texto filtra a lista pelo título. Vazio não faz nada.
 */
export function destinoBusca(texto: string): string | null {
  const limpo = texto.trim();
  if (!limpo) return null;
  const numero = limpo.replace(/^#/, "");
  if (/^\d+$/.test(numero)) return `/atendimento/${Number(numero)}`;
  return `/atendimento?modo=lista&busca=${encodeURIComponent(limpo)}`;
}
