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
  "vermelho-claro": { fundo: "bg-sis-vermelho-claro", texto: "text-texto" },
  "vermelho-escuro": { fundo: "bg-sis-vermelho-escuro", texto: "text-white" },
  "verde-claro": { fundo: "bg-sis-verde-claro", texto: "text-texto" },
  "azul-claro": { fundo: "bg-sis-azul-claro", texto: "text-texto" },
  "azul-escuro": { fundo: "bg-sis-azul-escuro", texto: "text-white" },
  roxo: { fundo: "bg-sis-roxo", texto: "text-white" },
  cinza: { fundo: "bg-sis-cinza", texto: "text-white" },
};

/** Classes de uma cor da paleta; null se não houver cor (ou se o banco mandar um nome desconhecido). */
export function classesDaCor(cor: CorPaleta | null | undefined): ClassesCor | null {
  return cor ? (PALETA[cor] ?? null) : null;
}

/** Cor de uma opção de um campo (campos_form.cores); null se a opção não tiver cor. */
export function corDaOpcao(campo: Pick<CampoForm, "cores">, valor: unknown): ClassesCor | null {
  return typeof valor === "string" ? classesDaCor(campo.cores[valor]) : null;
}
