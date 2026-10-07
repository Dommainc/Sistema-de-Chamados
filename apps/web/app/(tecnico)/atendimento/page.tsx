import type { Metadata } from "next";
import { QuadroAtendimento } from "@/components/tecnico/QuadroAtendimento";
import { lerCategoria, lerFiltro, lerPrazo, lerStatus } from "@/components/tecnico/parametros";

export const metadata: Metadata = { title: "Atendimento" };

function primeiro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

/** Área técnica: só o quadro (kanban). Filtros e busca ficam na URL. */
export default async function PaginaAtendimento({ searchParams }: PageProps<"/atendimento">) {
  const parametros = await searchParams;
  return (
    <QuadroAtendimento
      filtros={{
        responsavel: lerFiltro(primeiro(parametros.filtro)),
        categoriaId: lerCategoria(primeiro(parametros.categoria)),
        prazo: lerPrazo(primeiro(parametros.prazo)),
        coluna: lerStatus(primeiro(parametros.status)),
        busca: primeiro(parametros.busca) ?? "",
      }}
    />
  );
}
