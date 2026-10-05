import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { FaixaDemonstracao } from "@/components/comum/FaixaDemonstracao";
import { ProvedorToast } from "@/components/ui/Toast";
import { FONTE_DADOS } from "@/lib/dados/config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Central de Chamados", template: "%s — Central de Chamados" },
  description: "Abra e acompanhe seus pedidos de suporte para a TI da DOMMA.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {FONTE_DADOS === "simulada" ? <FaixaDemonstracao /> : null}
        <ProvedorToast>{children}</ProvedorToast>
      </body>
    </html>
  );
}
