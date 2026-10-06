import type { NextConfig } from "next";

// ADR 0006: a camada de dados simulada nunca pode ir para produção.
const fonteDados = process.env.NEXT_PUBLIC_FONTE_DADOS ?? "simulada";
if (process.env.VERCEL_ENV === "production" && fonteDados === "simulada") {
  throw new Error("NEXT_PUBLIC_FONTE_DADOS=simulada não é permitido em produção (docs/adr/0006).");
}

const nextConfig: NextConfig = {
  // A bolinha "N" do modo de desenvolvimento cobre botões nos prints e testes.
  devIndicators: false,
};

export default nextConfig;
