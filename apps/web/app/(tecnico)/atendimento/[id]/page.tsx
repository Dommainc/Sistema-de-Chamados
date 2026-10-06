import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AtendimentoChamado } from "@/components/tecnico/atendimento/AtendimentoChamado";

export async function generateMetadata({
  params,
}: PageProps<"/atendimento/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Chamado #${id}` };
}

export default async function PaginaChamadoTecnico({ params }: PageProps<"/atendimento/[id]">) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <AtendimentoChamado id={Number(id)} />;
}
