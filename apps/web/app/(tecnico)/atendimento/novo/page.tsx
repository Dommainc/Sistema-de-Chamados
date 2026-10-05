import type { Metadata } from "next";
import { GradeCategorias } from "@/components/abertura/GradeCategorias";
import { lerReferente } from "@/lib/rotas";

export const metadata: Metadata = { title: "Abrir chamado" };

/** A TI também abre chamado (ADR 0005), com o mesmo fluxo do portal. */
export default async function PaginaNovoChamadoTecnico({
  searchParams,
}: PageProps<"/atendimento/novo">) {
  const referente = lerReferente((await searchParams).referente);
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-texto-suave">Passo 1 de 3</p>
        <h1 className="text-3xl font-bold">Com o que você precisa de ajuda?</h1>
        <p className="text-texto-suave">
          Escolha o assunto. Na dúvida, use <strong className="text-texto">Outros</strong>.
        </p>
      </div>
      <GradeCategorias referente={referente} />
    </div>
  );
}
