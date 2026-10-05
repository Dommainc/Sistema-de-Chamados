import type { Metadata } from "next";
import { AvisoAguardandoResposta } from "@/components/solicitante/AvisoAguardandoResposta";
import { EscolhaCategoria } from "@/components/solicitante/EscolhaCategoria";

export const metadata: Metadata = { title: "Abrir chamado" };

export default function PaginaAbrirChamado() {
  return (
    <div className="flex flex-col gap-6">
      <AvisoAguardandoResposta />
      <h1 className="text-2xl font-semibold">Com o que você precisa de ajuda?</h1>
      <EscolhaCategoria />
    </div>
  );
}
