import type { Metadata } from "next";
import { ListaAvaliacoes } from "@/components/tecnico/dashboard/ListaAvaliacoes";
import { lerFiltro } from "@/components/tecnico/parametros";

export const metadata: Metadata = { title: "Avaliações" };

function primeiro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

/** Todas as avaliações da pesquisa de satisfação (ADR 0015). Filtros na URL: periodo, tecnico, nota. */
export default async function PaginaAvaliacoes({
  searchParams,
}: PageProps<"/atendimento/avaliacoes">) {
  const p = await searchParams;
  const tecnico = lerFiltro(primeiro(p.tecnico));
  const nota = Number(primeiro(p.nota));
  return (
    <ListaAvaliacoes
      periodo={primeiro(p.periodo) ?? "todas"}
      tecnico={
        tecnico === "todos" || tecnico === "meus" || tecnico === "sem_responsavel" ? null : tecnico
      }
      nota={Number.isInteger(nota) && nota >= 1 && nota <= 5 ? nota : null}
    />
  );
}
