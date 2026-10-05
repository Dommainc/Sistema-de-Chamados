// Sessão. Versão simulada (ADR 0006): cookie httpOnly só com o id do usuário; o papel vem
// da lista fixa no servidor. A versão real (Supabase Auth + papel do banco) entra depois da 1A-2.

import { FONTE_DADOS } from "@/lib/dados/config";
import { usuarioSimuladoPorId } from "@/lib/dados/simulada/usuarios";
import type { Perfil } from "@/lib/dominio/tipos";

export const COOKIE_SESSAO = "cc_sessao";

/** Usuário da sessão a partir do valor do cookie. Nulo = sem sessão válida. */
export function usuarioDaSessao(valorCookie: string | undefined): Perfil | null {
  if (FONTE_DADOS !== "simulada") {
    throw new Error("Sessão real ainda não implementada (depende da 1A-2).");
  }
  return usuarioSimuladoPorId(valorCookie);
}
