import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DetalheChamadoSolicitante } from "@/components/solicitante/DetalheChamadoSolicitante";

export async function generateMetadata({
  params,
}: PageProps<"/meus-chamados/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Chamado #${id}` };
}

export default async function PaginaChamadoSolicitante({
  params,
}: PageProps<"/meus-chamados/[id]">) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <DetalheChamadoSolicitante id={Number(id)} />;
}
