import type { Metadata } from "next";
import { AvisoAguardandoResposta } from "@/components/solicitante/AvisoAguardandoResposta";
import { EscolhaCategoria } from "@/components/solicitante/EscolhaCategoria";

export const metadata: Metadata = { title: "Abrir chamado" };

export default function PaginaAbrirChamado() {
  return (
    <div className="flex flex-col gap-6">
      <AvisoAguardandoResposta />
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-texto-suave">Passo 1 de 3</p>
        <h1 className="text-3xl font-bold">Com o que você precisa de ajuda?</h1>
        <p className="text-texto-suave">
          Escolha o assunto. Na dúvida, use <strong className="text-texto">Outros</strong>.
        </p>
      </div>
      <EscolhaCategoria />
    </div>
  );
}
