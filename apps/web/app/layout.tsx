import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { FaixaDemonstracao } from "@/components/comum/FaixaDemonstracao";
import { ProvedorToast } from "@/components/ui/Toast";
import { cookies } from "next/headers";
import { FONTE_DADOS } from "@/lib/dados/config";
import { COOKIE_TEMA, COR_DO_NAVEGADOR, temaDoCookie } from "@/lib/tema";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: { default: "Central de Chamados", template: "%s — Central de Chamados" },
  description: "Abra e acompanhe seus pedidos de suporte para a TI da DOMMA.",
};

async function lerTema() {
  return temaDoCookie((await cookies()).get(COOKIE_TEMA)?.value);
}

export async function generateViewport(): Promise<Viewport> {
  return { themeColor: COR_DO_NAVEGADOR[await lerTema()] };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Tela clara/escura (botão ☀/🌙): o cookie já desenha a página na cor certa, sem piscar.
  const tema = await lerTema();
  return (
    <html
      lang="pt-BR"
      data-tema={tema}
      className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        {FONTE_DADOS === "simulada" ? <FaixaDemonstracao /> : null}
        <ProvedorToast>{children}</ProvedorToast>
      </body>
    </html>
  );
}
