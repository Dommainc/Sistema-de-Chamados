// Proxy da camada `real`: renova a sessão do Supabase (cookies) a cada requisição e aplica a regra das áreas.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { decidirRota } from "@/lib/rotas";
import { lerSessao } from "@/lib/sessao-real";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/** Conta logada mas sem acesso (inativa ou fora de @dommainc.com.br — migration 0018). */
export const PAGINA_CONTA_SEM_ACESSO = "/conta-sem-acesso";

export async function proxyReal(request: NextRequest): Promise<NextResponse> {
  let resposta = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        resposta = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
      },
    },
  });

  const caminho = request.nextUrl.pathname;
  // A volta do login Microsoft troca o código pela sessão sozinha (app/auth/callback).
  if (caminho.startsWith("/auth/")) return resposta;

  const { usuario, perfil } = await lerSessao(supabase);
  const redirecionar = (para: string) => {
    const destino = NextResponse.redirect(new URL(para, request.url));
    resposta.cookies.getAll().forEach((c) => destino.cookies.set(c));
    return destino;
  };

  if (usuario && !perfil) {
    return caminho === PAGINA_CONTA_SEM_ACESSO ? resposta : redirecionar(PAGINA_CONTA_SEM_ACESSO);
  }
  const decisao = decidirRota(caminho, perfil?.papel ?? null);
  return decisao.tipo === "seguir" ? resposta : redirecionar(decisao.para);
}
