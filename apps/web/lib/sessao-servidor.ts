// Leitura da sessão em Server Components e Server Actions.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { UsuarioSessao } from "@/lib/dados/tipos";
import { COOKIE_SESSAO, usuarioDaSessao } from "@/lib/sessao";

export async function obterUsuarioSessao(): Promise<UsuarioSessao | null> {
  const perfil = usuarioDaSessao((await cookies()).get(COOKIE_SESSAO)?.value);
  return perfil ? { id: perfil.id, nome: perfil.nome, papel: perfil.papel } : null;
}

/** Usuário da sessão ou redireciona para /login (o proxy já barra, isto é a segunda linha). */
export async function exigirUsuarioSessao(): Promise<UsuarioSessao> {
  const usuario = await obterUsuarioSessao();
  if (!usuario) redirect("/login");
  return usuario;
}
