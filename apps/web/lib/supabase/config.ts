// Endereços do Supabase e da API para a camada `real` (ADR 0002, 0006). Só valores PÚBLICOS: a anon key é
// feita para o navegador (o RLS filtra); a service_role nunca entra no front (docs/segredos.md).

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

/** Login por e-mail/senha dos usuários de teste: só local e CI. O next.config.ts recusa em produção. */
export const LOGIN_DEV = process.env.NEXT_PUBLIC_LOGIN_DEV === "true";
