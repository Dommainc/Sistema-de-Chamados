import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormularioChamado } from "@/components/abertura/FormularioChamado";
import { lerReferente } from "@/lib/rotas";

export const metadata: Metadata = { title: "Abrir chamado" };

export default async function PaginaFormularioTecnico({
  params,
  searchParams,
}: PageProps<"/atendimento/novo/[categoria]">) {
  const { categoria } = await params;
  if (!/^\d+$/.test(categoria)) notFound();
  return (
    <div className="-mx-4 -my-6 flex flex-col">
      <FormularioChamado
        categoriaId={Number(categoria)}
        referente={lerReferente((await searchParams).referente)}
      />
    </div>
  );
}
