// Parâmetros da URL da área técnica (filtros compartilháveis por link).

import type { ColunaQuadro } from "./quadro";

import { PRIORIDADES_DA_TI, type PrioridadeDaTi } from "@/lib/dominio/tipos";

/** "Responsável": sem filtro, ninguém ainda, ou o id de um técnico ("Só os meus" é um botão à parte). */
export type FiltroResponsavel = "todos" | "sem_responsavel" | (string & {});

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

/** Filtro "Sistema": o nome do sistema como está no formulário (ex.: "Sienge"); vazio = qualquer. */
export function lerSistema(valor: string | null | undefined): string | null {
  const limpo = valor?.trim() ?? "";
  return limpo && limpo.length <= 60 ? limpo : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function lerFiltro(valor: string | null | undefined): FiltroResponsavel {
  if (valor === "sem_responsavel") return valor;
  return valor && UUID.test(valor) ? valor.toLowerCase() : "todos";
}

/** "Só os meus" (?meus=1; links antigos com ?filtro=meus também valem). */
export function lerSoMeus(meus: string | null | undefined, filtro?: string | null): boolean {
  return meus === "1" || filtro === "meus";
}

export function lerPrioridade(valor: string | null | undefined): PrioridadeDaTi | null {
  return PRIORIDADES_DA_TI.find((p) => p === valor) ?? null;
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

/** Visão da área técnica: "quadro" (padrão) ou "lista" (?visao=lista). */
export function lerVisao(valor: string | null | undefined): "quadro" | "lista" {
  return valor === "lista" ? "lista" : "quadro";
}

/** Lista: agrupar por status (padrão), responsável ou categoria. */
export function lerAgrupamento(
  valor: string | null | undefined,
): "status" | "responsavel" | "categoria" {
  return valor === "responsavel" || valor === "categoria" ? valor : "status";
}

/** Lista: ordem pelo prazo (?ordem=prazo ou -prazo); sem parâmetro = a ordem do quadro. */
export function lerOrdem(valor: string | null | undefined): "padrao" | "prazo" | "-prazo" {
  return valor === "prazo" || valor === "-prazo" ? valor : "padrao";
}
