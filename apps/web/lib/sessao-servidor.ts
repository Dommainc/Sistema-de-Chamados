// Leitura da sessão em Server Components e Server Actions.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { UsuarioSessao } from "@/lib/dados/tipos";
import { FONTE_DADOS } from "@/lib/dados/config";
import { COOKIE_SESSAO, usuarioDaSessao } from "@/lib/sessao";
import { lerSessao } from "@/lib/sessao-real";
import { clienteServidor } from "@/lib/supabase/servidor";

export async function obterUsuarioSessao(): Promise<UsuarioSessao | null> {
  if (FONTE_DADOS === "real") {
    const { perfil } = await lerSessao(await clienteServidor());
    return perfil ? { id: perfil.id, nome: perfil.nome, papel: perfil.papel } : null;
  }
  const perfil = usuarioDaSessao((await cookies()).get(COOKIE_SESSAO)?.value);
  return perfil ? { id: perfil.id, nome: perfil.nome, papel: perfil.papel } : null;
}

/** Usuário da sessão ou redireciona para /login (o proxy já barra, isto é a segunda linha). */
export async function exigirUsuarioSessao(): Promise<UsuarioSessao> {
  const usuario = await obterUsuarioSessao();
  if (!usuario) redirect("/login");
  return usuario;
}
