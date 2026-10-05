// Área técnica: ferramenta de trabalho, densa, pensada para desktop (docs/ui-ux.md).

import { Suspense } from "react";
import { BarraTecnico } from "@/components/tecnico/BarraTecnico";
import { ProvedorDados } from "@/lib/dados/provedor";
import { exigirUsuarioSessao } from "@/lib/sessao-servidor";

export default async function LayoutTecnico({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuarioSessao();

  return (
    <ProvedorDados usuario={usuario}>
      <Suspense fallback={<div className="h-16 bg-barra" />}>
        <BarraTecnico />
      </Suspense>
      <main className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-6">{children}</main>
    </ProvedorDados>
  );
}
