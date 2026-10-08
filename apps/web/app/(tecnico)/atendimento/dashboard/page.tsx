import type { Metadata } from "next";
import { PainelDashboard } from "@/components/tecnico/dashboard/PainelDashboard";

export const metadata: Metadata = { title: "Dashboard" };

function primeiro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

/** Dashboard da TI (ADR 0013). Período na URL: ?periodo=7d|30d|mes|mes_passado|datas&de=&ate= */
export default async function PaginaDashboard({
  searchParams,
}: PageProps<"/atendimento/dashboard">) {
  const p = await searchParams;
  return <PainelDashboard chave={primeiro(p.periodo)} de={primeiro(p.de)} ate={primeiro(p.ate)} />;
}
