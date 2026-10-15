"use client";

// Cliente do Supabase no navegador (camada `real`): a sessão fica em cookies, compartilhada com o servidor.

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

let cliente: SupabaseClient | null = null;

export function clienteNavegador(): SupabaseClient {
  cliente ??= createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return cliente;
}
