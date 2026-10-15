// Sessão da camada `real`: quem está logado no Supabase Auth e o perfil dele (papel e ativo) na tabela profiles.
// Usado pelo proxy.ts e pelos Server Components. É experiência: a segurança de verdade é RLS + API.

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Papel } from "@/lib/dominio/tipos";

export interface PerfilSessao {
  id: string;
  nome: string;
  papel: Papel;
  ativo: boolean;
}

export interface Sessao {
  /** Usuário do Supabase Auth (nulo = sem login). */
  usuario: User | null;
  /** Perfil na Central. Nulo com usuário logado = perfil inativo (o RLS esconde) ou ainda não criado. */
  perfil: PerfilSessao | null;
}

export async function lerSessao(supabase: SupabaseClient): Promise<Sessao> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { usuario: null, perfil: null };
  const { data } = await supabase
    .from("profiles")
    .select("id, nome, papel, ativo")
    .eq("id", user.id)
    .maybeSingle<PerfilSessao>();
  return { usuario: user, perfil: data && data.ativo ? data : null };
}
