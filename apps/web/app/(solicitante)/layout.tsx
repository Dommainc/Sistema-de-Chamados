// Portal do solicitante: leve, poucos elementos, pensado para celular.

import Link from "next/link";
import { BotaoSair } from "@/components/comum/BotaoSair";
import { LinkNav } from "@/components/comum/LinkNav";
import { GuardaPrimeiroAcesso } from "@/components/solicitante/GuardaPrimeiroAcesso";
import { ProvedorDados } from "@/lib/dados/provedor";
import { exigirUsuarioSessao } from "@/lib/sessao-servidor";

export default async function LayoutSolicitante({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuarioSessao();
  const primeiroNome = usuario.nome.split(" ")[0];

  return (
    <ProvedorDados usuario={usuario}>
      <header className="bg-primaria text-sobre-primaria">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-2">
          <Link href="/" className="flex min-h-11 items-center gap-2 font-semibold">
            <span className="rounded bg-white px-2 py-0.5 text-sm text-primaria">DOMMA</span>
            <span>Central de Chamados</span>
          </Link>
          <div className="flex items-center gap-1">
            <span className="hidden px-2 text-sm sm:inline">Olá, {primeiroNome}</span>
            <BotaoSair />
          </div>
        </div>
        <nav aria-label="Menu principal" className="mx-auto flex w-full max-w-3xl gap-1 px-2 pb-2">
          <LinkNav href="/">Abrir chamado</LinkNav>
          <LinkNav href="/meus-chamados">Meus chamados</LinkNav>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <GuardaPrimeiroAcesso>{children}</GuardaPrimeiroAcesso>
      </main>
    </ProvedorDados>
  );
}
