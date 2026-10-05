// Área técnica: ferramenta de trabalho, densa, pensada para desktop.

import Link from "next/link";
import { Suspense } from "react";
import { BotaoSair } from "@/components/comum/BotaoSair";
import { BarraTecnico } from "@/components/tecnico/BarraTecnico";
import { ProvedorDados } from "@/lib/dados/provedor";
import { exigirUsuarioSessao } from "@/lib/sessao-servidor";

export default async function LayoutTecnico({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuarioSessao();

  return (
    <ProvedorDados usuario={usuario}>
      <header className="bg-primaria-forte text-sobre-primaria">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2">
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/atendimento" className="flex min-h-11 items-center gap-2 font-semibold">
              <span className="rounded bg-white px-2 py-0.5 text-sm text-primaria-forte">
                DOMMA
              </span>
              <span>Atendimento TI</span>
            </Link>
            <Suspense fallback={null}>
              <BarraTecnico />
            </Suspense>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-2 text-sm">{usuario.nome}</span>
            <BotaoSair />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </ProvedorDados>
  );
}
