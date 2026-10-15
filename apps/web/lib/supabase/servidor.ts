// Cliente do Supabase no servidor (Server Components, Server Actions e rotas), lendo a sessão dos cookies.

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

export async function clienteServidor(): Promise<SupabaseClient> {
  const loja = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => loja.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => loja.set(name, value, options));
        } catch {
          // Server Component não pode gravar cookie; o proxy.ts já renova a sessão a cada requisição.
        }
      },
    },
  });
}
