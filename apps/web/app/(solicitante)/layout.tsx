// Portal do solicitante: leve, poucos elementos, pensado para celular (docs/ui-ux.md).

import Link from "next/link";
import { MenuUsuario } from "@/components/comum/MenuUsuario";
import { GuardaPrimeiroAcesso } from "@/components/solicitante/GuardaPrimeiroAcesso";
import { MenuCabecalho, MenuInferior } from "@/components/solicitante/NavegacaoPortal";
import { Logo } from "@/components/ui/Logo";
import { ProvedorDados } from "@/lib/dados/provedor";
import { exigirUsuarioSessao } from "@/lib/sessao-servidor";

export default async function LayoutSolicitante({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuarioSessao();

  return (
    <ProvedorDados usuario={usuario}>
      <header className="border-b border-borda bg-superficie">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="min-h-11">
            <Logo subtitulo="Central de Chamados" />
          </Link>
          <MenuCabecalho />
          <MenuUsuario nome={usuario.nome} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-6 pb-28 md:pb-10">
        <GuardaPrimeiroAcesso>{children}</GuardaPrimeiroAcesso>
      </main>
      <MenuInferior />
    </ProvedorDados>
  );
}
