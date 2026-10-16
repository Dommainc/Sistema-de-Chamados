// Volta do login Microsoft (camada `real`): troca o código pela sessão, sincroniza o papel pelo grupo do Entra
// (POST /auth/sincronizar — ADR 0004) e manda cada um para a sua área.

import { NextResponse, type NextRequest } from "next/server";
import { chamarApi } from "@/lib/dados/real/api";
import type { Papel } from "@/lib/dominio/tipos";
import { ErroApp } from "@/lib/erros/catalogo";
import { inicioDoPapel } from "@/lib/rotas";
import { COOKIE_TEMA, OPCOES_COOKIE_TEMA, temaDoCookie } from "@/lib/tema";
import { clienteServidor } from "@/lib/supabase/servidor";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const para = (caminho: string) => NextResponse.redirect(new URL(caminho, url.origin));
  const codigo = url.searchParams.get("code");
  if (!codigo) return para("/login?motivo=falha");

  const supabase = await clienteServidor();
  const { data, error } = await supabase.auth.exchangeCodeForSession(codigo);
  if (error || !data.session) return para("/login?motivo=falha");

  try {
    const perfil = await chamarApi<{ papel: Papel; ativo: boolean; tema?: string }>(
      "/auth/sincronizar",
      { metodo: "POST", token: data.session.access_token },
    );
    const resposta = para(perfil.ativo ? inicioDoPapel(perfil.papel) : "/conta-sem-acesso");
    // A tela clara/escura escolhida da última vez (fica no perfil, vale em qualquer computador).
    resposta.cookies.set(COOKIE_TEMA, temaDoCookie(perfil.tema), OPCOES_COOKIE_TEMA);
    return resposta;
  } catch (erro) {
    // Conta fora da DOMMA ou desativada: a API responde SEM_PERMISSAO (migration 0018).
    if (erro instanceof ErroApp && erro.codigo === "SEM_PERMISSAO")
      return para("/conta-sem-acesso");
    return para("/login?motivo=falha");
  }
}
