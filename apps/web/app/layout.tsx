import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { FaixaDemonstracao } from "@/components/comum/FaixaDemonstracao";
import { ProvedorToast } from "@/components/ui/Toast";
import { FONTE_DADOS } from "@/lib/dados/config";
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

export const viewport: Viewport = {
  themeColor: "#f2f0eb",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {FONTE_DADOS === "simulada" ? <FaixaDemonstracao /> : null}
        <ProvedorToast>{children}</ProvedorToast>
      </body>
    </html>
  );
}
