"use client";

import { usePathname } from "next/navigation";

/**
 * Conteúdo da área técnica. O quadro (`/atendimento`) usa a largura toda da tela, para as 6 colunas iguais não
 * ficarem estreitas em monitores largos (pedido do dono, 2026-10-08); as outras telas ficam centralizadas.
 */
export function AreaPrincipal({ children }: { children: React.ReactNode }) {
  const quadro = usePathname() === "/atendimento";
  return (
    <main className={`w-full flex-1 px-4 py-6 ${quadro ? "" : "mx-auto max-w-[90rem]"}`}>
      {children}
    </main>
  );
}
