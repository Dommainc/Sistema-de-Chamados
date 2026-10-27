import type { Metadata } from "next";
import { QuadroAtendimento } from "@/components/tecnico/QuadroAtendimento";
import {
  lerCategoria,
  lerFiltro,
  lerPrioridade,
  lerSistema,
  lerSoMeus,
} from "@/components/tecnico/parametros";

export const metadata: Metadata = { title: "Atendimento" };

function primeiro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

/** Área técnica: o quadro (layout novo). Filtros e busca ficam na URL. */
export default async function PaginaAtendimento({ searchParams }: PageProps<"/atendimento">) {
  const parametros = await searchParams;
  return (
    <QuadroAtendimento
      filtros={{
        responsavel: lerFiltro(primeiro(parametros.filtro)),
        soMeus: lerSoMeus(primeiro(parametros.meus), primeiro(parametros.filtro)),
        categoriaId: lerCategoria(primeiro(parametros.categoria)),
        sistema: lerSistema(primeiro(parametros.sistema)),
        prioridade: lerPrioridade(primeiro(parametros.prioridade)),
        busca: primeiro(parametros.busca) ?? "",
      }}
    />
  );
}
