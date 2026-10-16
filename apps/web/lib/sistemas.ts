// Cores das opções dos formulários (pedido do dono, 2026-10-07/08). A cor de cada opção fica no BANCO
// (campos_form.cores, migration 0022) como um nome da paleta fixa; aqui só se traduz o nome da paleta para
// as classes dos tokens sis-* do globals.css. Classes fixas: o Tailwind precisa vê-las escritas por inteiro.

import type { CampoForm, CorPaleta } from "@/lib/dominio/tipos";

/** Chave do campo do formulário que guarda o sistema (categoria "Solicitações de acesso e Permissões"). */
export const CHAVE_SISTEMA = "sistema";

/** Opção "nenhum sistema": tem cor no formulário, mas não aparece no cartão do quadro. */
export const SEM_SISTEMA = "Não se aplica";

export interface ClassesCor {
  fundo: string;
  texto: string;
}

const PALETA: Record<CorPaleta, ClassesCor> = {
  vermelho: { fundo: "bg-sis-vermelho", texto: "text-white" },
  "vermelho-claro": { fundo: "bg-sis-vermelho-claro", texto: "text-sobre-claro" },
  "vermelho-escuro": { fundo: "bg-sis-vermelho-escuro", texto: "text-white" },
  "verde-claro": { fundo: "bg-sis-verde-claro", texto: "text-sobre-claro" },
  "azul-claro": { fundo: "bg-sis-azul-claro", texto: "text-sobre-claro" },
  "azul-escuro": { fundo: "bg-sis-azul-escuro", texto: "text-white" },
  roxo: { fundo: "bg-sis-roxo", texto: "text-white" },
  cinza: { fundo: "bg-sis-cinza", texto: "text-white" },
  verde: { fundo: "bg-sis-verde", texto: "text-white" },
  "verde-escuro": { fundo: "bg-sis-verde-escuro", texto: "text-white" },
  "verde-agua": { fundo: "bg-sis-verde-agua", texto: "text-white" },
  oliva: { fundo: "bg-sis-oliva", texto: "text-white" },
  azul: { fundo: "bg-sis-azul", texto: "text-white" },
  indigo: { fundo: "bg-sis-indigo", texto: "text-white" },
  magenta: { fundo: "bg-sis-magenta", texto: "text-white" },
  marrom: { fundo: "bg-sis-marrom", texto: "text-white" },
  grafite: { fundo: "bg-sis-grafite", texto: "text-white" },
  laranja: { fundo: "bg-sis-laranja", texto: "text-white" },
  mostarda: { fundo: "bg-sis-mostarda", texto: "text-white" },
  ciano: { fundo: "bg-sis-ciano", texto: "text-sobre-claro" },
  lilas: { fundo: "bg-sis-lilas", texto: "text-sobre-claro" },
  rosa: { fundo: "bg-sis-rosa", texto: "text-sobre-claro" },
  "laranja-claro": { fundo: "bg-sis-laranja-claro", texto: "text-sobre-claro" },
  areia: { fundo: "bg-sis-areia", texto: "text-sobre-claro" },
  amarelo: { fundo: "bg-sis-amarelo", texto: "text-sobre-claro" },
};

/** Classes de uma cor da paleta; null se não houver cor (ou se o banco mandar um nome desconhecido). */
export function classesDaCor(cor: CorPaleta | null | undefined): ClassesCor | null {
  return cor ? (PALETA[cor] ?? null) : null;
}

/** Cor de uma opção de um campo (campos_form.cores); null se a opção não tiver cor. */
export function corDaOpcao(campo: Pick<CampoForm, "cores">, valor: unknown): ClassesCor | null {
  return typeof valor === "string" ? classesDaCor(campo.cores[valor]) : null;
}

/**
 * Módulo escolhido para o sistema (campos "modulo_*" — migration 0031), para o cartão do quadro:
 * "■ Sienge · Financeiro". "Não sei" não aparece.
 */
export function moduloDe(respostas: Record<string, unknown>): string | null {
  for (const [chave, valor] of Object.entries(respostas)) {
    if (chave.startsWith("modulo_") && typeof valor === "string" && valor && valor !== "Não sei") {
      return valor;
    }
  }
  return null;
}
