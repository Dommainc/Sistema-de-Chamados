import type { Metadata } from "next";
import { FormPrimeiroAcesso } from "@/components/solicitante/FormPrimeiroAcesso";
import { Card } from "@/components/ui/Card";
import { ProvedorDados } from "@/lib/dados/provedor";
import { exigirUsuarioSessao } from "@/lib/sessao-servidor";

export const metadata: Metadata = { title: "Primeiro acesso" };

export default async function PaginaPrimeiroAcesso() {
  const usuario = await exigirUsuarioSessao();
  return (
    <ProvedorDados usuario={usuario}>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <Card className="flex w-full max-w-md flex-col gap-4 p-6">
          <div>
            <h1 className="text-2xl font-semibold">Olá, {usuario.nome.split(" ")[0]}!</h1>
            <p className="mt-2 text-texto-suave">
              Antes de começar, conte em que setor você trabalha. Só vamos perguntar uma vez.
            </p>
          </div>
          <FormPrimeiroAcesso />
        </Card>
      </main>
    </ProvedorDados>
  );
}
