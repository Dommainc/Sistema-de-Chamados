import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormularioChamado } from "@/components/abertura/FormularioChamado";
import { lerReferente } from "@/lib/rotas";

export const metadata: Metadata = { title: "Abrir chamado" };

export default async function PaginaFormulario({
  params,
  searchParams,
}: PageProps<"/abrir/[categoria]">) {
  const { categoria } = await params;
  if (!/^\d+$/.test(categoria)) notFound();
  return (
    <FormularioChamado
      categoriaId={Number(categoria)}
      referente={lerReferente((await searchParams).referente)}
    />
  );
}
