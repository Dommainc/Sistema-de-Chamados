// Passos 2 e 3 do "Abrir chamado" no portal: tela focada, sem cabeçalho nem menu inferior (mockup).

import { BotaoAjuda } from "@/components/comum/BotaoAjuda";
import { GuardaPrimeiroAcesso } from "@/components/solicitante/GuardaPrimeiroAcesso";
import { ProvedorDados } from "@/lib/dados/provedor";
import { exigirUsuarioSessao } from "@/lib/sessao-servidor";

export default async function LayoutFoco({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuarioSessao();
  return (
    <ProvedorDados usuario={usuario}>
      <main className="flex flex-1 flex-col">
        <GuardaPrimeiroAcesso>{children}</GuardaPrimeiroAcesso>
      </main>
      <BotaoAjuda href="/ajuda" posicao="acimaDoEnvio" />
    </ProvedorDados>
  );
}
