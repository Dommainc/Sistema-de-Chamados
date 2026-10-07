import type { NextConfig } from "next";

// ADR 0006: a camada de dados simulada nunca pode ir para produção.
const fonteDados = process.env.NEXT_PUBLIC_FONTE_DADOS ?? "simulada";
if (process.env.VERCEL_ENV === "production" && fonteDados === "simulada") {
  throw new Error("NEXT_PUBLIC_FONTE_DADOS=simulada não é permitido em produção (docs/adr/0006).");
}

const desenvolvimento = process.env.NODE_ENV !== "production";

/** Origem (esquema + host) de uma URL de ambiente; vazio se não estiver configurada. */
function origem(url: string | undefined): string {
  try {
    return url ? new URL(url).origin : "";
  } catch {
    return "";
  }
}

const supabase = origem(process.env.NEXT_PUBLIC_SUPABASE_URL);
const api = origem(process.env.NEXT_PUBLIC_API_URL);
// Realtime do Supabase usa WebSocket (wss://).
const supabaseWs = supabase.replace(/^http/, "ws");

/**
 * Política de conteúdo (CSP): o navegador só carrega script, estilo, imagem e conexões das origens abaixo.
 * - Next.js usa scripts/estilos inline (sem nonce) → 'unsafe-inline'; em desenvolvimento também 'unsafe-eval' e
 *   o WebSocket do recarregamento automático.
 * - Imagens: as próprias, `blob:` (prévia de print colado) e o Storage do Supabase (URLs assinadas dos anexos).
 * - Fontes IBM Plex vêm do próprio site (next/font baixa no build).
 * - Ninguém pode abrir a Central dentro de outro site (frame-ancestors 'none').
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${desenvolvimento ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: ${supabase}`.trim(),
  "font-src 'self'",
  `connect-src 'self' ${supabase} ${supabaseWs} ${api}${desenvolvimento ? " ws: http://localhost:*" : ""}`
    .replace(/\s+/g, " ")
    .trim(),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

/** Cabeçalhos de segurança em todas as páginas (docs/segredos.md, "Proteções do site"). */
const CABECALHOS_SEGURANCA = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // A bolinha "N" do modo de desenvolvimento cobre botões nos prints e testes.
  devIndicators: false,
  // Não anunciar "X-Powered-By: Next.js".
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:caminho*", headers: CABECALHOS_SEGURANCA }];
  },
};

export default nextConfig;
