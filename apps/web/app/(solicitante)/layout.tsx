// Portal do solicitante: leve, pensado para celular (docs/ui-ux.md); no computador usa a largura da tela.

import { BotaoAjuda } from "@/components/comum/BotaoAjuda";
import Link from "next/link";
import { BotaoTemaPerfil } from "@/components/comum/BotaoTemaPerfil";
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
      <header className="border-b border-borda bg-superficie print:hidden">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-8">
          <Link
            href="/"
            aria-label="DOMMA — voltar ao início"
            className="flex min-h-11 items-center"
          >
            <Logo />
          </Link>
          <MenuCabecalho />
          <div className="flex items-center gap-1">
            <BotaoTemaPerfil />
            <MenuUsuario nome={usuario.nome} atalhos={[{ href: "/ajuda", rotulo: "Ajuda" }]} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 md:px-8 md:pb-10">
        <GuardaPrimeiroAcesso>{children}</GuardaPrimeiroAcesso>
      </main>
      <MenuInferior />
      <BotaoAjuda href="/ajuda" acimaDoMenu />
    </ProvedorDados>
  );
}
