import type { Metadata } from "next";
import { TabelaAtendimento, type AbaAtendimento } from "@/components/tecnico/TabelaAtendimento";

export const metadata: Metadata = { title: "Atendimento" };

const TITULOS: Record<AbaAtendimento, string> = {
  fila: "Fila",
  meus: "Meus atendimentos",
  todos: "Todos os chamados",
};

function lerAba(valor: string | string[] | undefined): AbaAtendimento {
  return valor === "meus" || valor === "todos" ? valor : "fila";
}

export default async function PaginaAtendimento({ searchParams }: PageProps<"/atendimento">) {
  const aba = lerAba((await searchParams).aba);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{TITULOS[aba]}</h1>
      <TabelaAtendimento aba={aba} />
    </div>
  );
}
