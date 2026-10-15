// Chamada à FastAPI (camada `real` — ADR 0002, 0007): toda ação de negócio passa por aqui, com o token do Supabase.
// Erros viram ErroApp do catálogo; nunca chega à tela mensagem crua de fetch, Supabase ou stack trace.

import { ErroApp, ehCodigoErro, type CodigoErro, type ErroDeCampo } from "@/lib/erros/catalogo";
import { API_URL } from "@/lib/supabase/config";

export interface OpcoesApi {
  metodo?: "GET" | "POST" | "PATCH";
  corpo?: unknown;
  /** Token de acesso do Supabase (Authorization: Bearer). Sem token = sessão expirada. */
  token: string | null;
  /** Código quando a rede falha (ex.: MENSAGEM_NAO_ENVIADA no chat). Padrão: ERRO_INESPERADO. */
  erroDeRede?: CodigoErro;
}

interface CorpoDeErro {
  erro?: { codigo?: unknown; mensagem?: unknown; campos?: unknown; ref?: unknown };
}

/** Corpo de erro da API ({erro: {codigo, mensagem, campos, ref}}) → ErroApp. */
export function erroDaApi(status: number, corpo: unknown): ErroApp {
  const erro = (corpo as CorpoDeErro | null)?.erro;
  if (erro && ehCodigoErro(erro.codigo)) {
    const campos = Array.isArray(erro.campos)
      ? (erro.campos as ErroDeCampo[]).filter(
          (c) => typeof c?.campo === "string" && typeof c?.mensagem === "string",
        )
      : [];
    return new ErroApp(erro.codigo, typeof erro.ref === "string" ? { ref: erro.ref } : {}, {
      campos,
      mensagem: typeof erro.mensagem === "string" ? erro.mensagem : undefined,
    });
  }
  if (status === 401) return new ErroApp("SESSAO_EXPIRADA");
  if (status === 403) return new ErroApp("SEM_PERMISSAO");
  return new ErroApp("ERRO_INESPERADO");
}

/**
 * Endereço base da API. No navegador: NEXT_PUBLIC_API_URL (na Vercel, "/api" — o mesmo domínio do site, ADR 0017;
 * local, http://localhost:8000). No servidor do site (ex.: /auth/callback): o endereço interno que a Vercel Services
 * injeta no binding API_INTERNA_URL; sem ele, o mesmo NEXT_PUBLIC_API_URL.
 */
export function baseDaApi(): string {
  if (typeof window === "undefined") {
    const interna = process.env.API_INTERNA_URL;
    if (interna) return interna.replace(/\/+$/, "");
  }
  return API_URL;
}

export async function chamarApi<T>(caminho: string, opcoes: OpcoesApi): Promise<T> {
  if (!opcoes.token) throw new ErroApp("SESSAO_EXPIRADA");
  const temCorpo = opcoes.corpo !== undefined;
  let resposta: Response;
  try {
    resposta = await fetch(`${baseDaApi()}${caminho}`, {
      method: opcoes.metodo ?? "GET",
      headers: {
        Authorization: `Bearer ${opcoes.token}`,
        ...(temCorpo ? { "Content-Type": "application/json" } : {}),
      },
      body: temCorpo ? JSON.stringify(opcoes.corpo) : undefined,
    });
  } catch {
    throw new ErroApp(opcoes.erroDeRede ?? "ERRO_INESPERADO");
  }
  if (resposta.status === 204) return undefined as T;
  const corpo: unknown = await resposta.json().catch(() => null);
  if (!resposta.ok) throw erroDaApi(resposta.status, corpo);
  return corpo as T;
}
