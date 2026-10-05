// Validação do formulário dinâmico contra campos_form (espelho de apps/api/app/dominio/formulario.py).
// Erro em qualquer campo → CAMPO_OBRIGATORIO, com a lista `campos` (chave + mensagem) para exibir inline.

import { ErroApp, mensagemErro, type ErroDeCampo } from "@/lib/erros/catalogo";
import type { CampoForm, ValorResposta } from "./tipos";

/** Chave usada para o "Resumo do problema" (vira chamados.titulo). */
export const CHAVE_TITULO = "titulo";
export const ROTULO_TITULO = "Resumo do problema";
export const TITULO_MAX = 200;

export interface FormularioValidado {
  titulo: string;
  respostas: Record<string, ValorResposta>;
}

function vazio(valor: unknown): boolean {
  if (valor === undefined || valor === null) return true;
  if (typeof valor === "string") return valor.trim() === "";
  if (Array.isArray(valor)) return valor.length === 0;
  return false;
}

function erroCampo(chave: string, rotulo: string): ErroDeCampo {
  return { campo: chave, mensagem: mensagemErro("CAMPO_OBRIGATORIO", { campo: rotulo }) };
}

/** Converte o valor bruto para o tipo do campo; `undefined` = valor inválido. */
function normalizar(campo: CampoForm, valor: unknown): ValorResposta | undefined {
  switch (campo.tipo) {
    case "texto":
    case "texto_longo":
      return typeof valor === "string" ? valor.trim() : undefined;
    case "numero": {
      const n = typeof valor === "number" ? valor : Number(String(valor).replace(",", "."));
      return Number.isFinite(n) ? n : undefined;
    }
    case "data": {
      if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return undefined;
      const data = new Date(`${valor}T12:00:00Z`);
      return Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valor
        ? undefined
        : valor;
    }
    case "selecao":
      return typeof valor === "string" && campo.opcoes.includes(valor) ? valor : undefined;
    case "multipla_selecao":
      return Array.isArray(valor) && valor.every((v) => campo.opcoes.includes(String(v)))
        ? valor.map(String)
        : undefined;
    case "sim_nao":
      if (typeof valor === "boolean") return valor;
      if (valor === "sim") return true;
      if (valor === "nao") return false;
      return undefined;
  }
}

/** Valida título + respostas. Ignora chaves que não são campos da categoria. */
export function validarFormulario(
  campos: CampoForm[],
  titulo: string,
  respostas: Record<string, unknown>,
): FormularioValidado {
  const erros: ErroDeCampo[] = [];
  const tituloLimpo = titulo.trim();
  if (tituloLimpo.length < 3) erros.push(erroCampo(CHAVE_TITULO, ROTULO_TITULO));

  const validas: Record<string, ValorResposta> = {};
  for (const campo of [...campos].sort((a, b) => a.ordem - b.ordem)) {
    const bruto = respostas[campo.chave];
    if (vazio(bruto)) {
      if (campo.obrigatorio) erros.push(erroCampo(campo.chave, campo.label));
      continue;
    }
    const valor = normalizar(campo, bruto);
    if (valor === undefined) {
      erros.push(erroCampo(campo.chave, campo.label));
      continue;
    }
    validas[campo.chave] = valor;
  }

  if (erros.length > 0) {
    const primeiro =
      erros[0].campo === CHAVE_TITULO
        ? ROTULO_TITULO
        : (campos.find((c) => c.chave === erros[0].campo)?.label ?? "");
    throw new ErroApp("CAMPO_OBRIGATORIO", { campo: primeiro }, { campos: erros });
  }
  return { titulo: tituloLimpo.slice(0, TITULO_MAX), respostas: validas };
}
