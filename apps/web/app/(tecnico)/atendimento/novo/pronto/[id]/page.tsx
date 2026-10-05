import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConfirmacaoChamado } from "@/components/abertura/ConfirmacaoChamado";

export const metadata: Metadata = { title: "Chamado aberto" };

export default async function PaginaProntoTecnico({
  params,
}: PageProps<"/atendimento/novo/pronto/[id]">) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <ConfirmacaoChamado id={Number(id)} />;
}
