// Rascunho do "Abrir chamado": "Voltar" e "Trocar assunto" mantêm o que já foi digitado.
// Textos ficam no sessionStorage (sobrevivem a recarregar a aba); arquivos ficam em memória
// (sobrevivem à navegação dentro do sistema, não a recarregar).

import type { ArquivoNovo } from "@/lib/dados/tipos";

const CHAVE = "central-chamados:rascunho-abertura";

export interface RascunhoTexto {
  titulo: string;
  /** Por campos_form.chave. Chaves iguais entre categorias (ex.: "descricao") são reaproveitadas. */
  respostas: Record<string, unknown>;
}

export interface ArquivoSelecionado extends ArquivoNovo {
  id: string;
  /** URL temporária (object URL) para a miniatura de imagens. */
  previa: string | null;
}

const VAZIO: RascunhoTexto = { titulo: "", respostas: {} };
let arquivosEmMemoria: ArquivoSelecionado[] = [];

export function lerRascunho(): RascunhoTexto {
  try {
    const bruto = globalThis.sessionStorage?.getItem(CHAVE);
    if (!bruto) return VAZIO;
    const r = JSON.parse(bruto) as Partial<RascunhoTexto>;
    return { titulo: r.titulo ?? "", respostas: r.respostas ?? {} };
  } catch {
    return VAZIO;
  }
}

export function salvarRascunho(rascunho: RascunhoTexto): void {
  try {
    globalThis.sessionStorage?.setItem(CHAVE, JSON.stringify(rascunho));
  } catch {
    // Sem sessionStorage: o rascunho vale só enquanto a tela estiver aberta.
  }
}

export function lerArquivosRascunho(): ArquivoSelecionado[] {
  return arquivosEmMemoria;
}

export function salvarArquivosRascunho(arquivos: ArquivoSelecionado[]): void {
  arquivosEmMemoria = arquivos;
}

/** Depois de abrir o chamado: apaga textos, arquivos e as miniaturas temporárias. */
export function limparRascunho(): void {
  try {
    globalThis.sessionStorage?.removeItem(CHAVE);
  } catch {
    // ignora
  }
  for (const a of arquivosEmMemoria) if (a.previa) URL.revokeObjectURL(a.previa);
  arquivosEmMemoria = [];
}
