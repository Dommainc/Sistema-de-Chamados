// Parâmetros da URL da área técnica (filtros compartilháveis por link).
// A área técnica tem só o quadro (kanban) — decisão do dono em 2026-10-06, sem modo "Lista".

export type FiltroResponsavel = "todos" | "meus" | "sem_responsavel";

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
