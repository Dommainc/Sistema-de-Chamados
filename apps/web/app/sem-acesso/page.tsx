import type { Metadata } from "next";
import { TelaMensagem } from "@/components/comum/TelaMensagem";
import { inicioDoPapel } from "@/lib/rotas";
import { exigirUsuarioSessao } from "@/lib/sessao-servidor";

export const metadata: Metadata = { title: "Sem acesso" };

export default async function PaginaSemAcesso() {
  const usuario = await exigirUsuarioSessao();
  return (
    <main className="flex flex-1">
      <TelaMensagem
        titulo="Você não tem acesso a esta área"
        texto="Esta página é só para a equipe de TI. Se acha que isso é um erro, fale com a TI."
        acao={{ rotulo: "Voltar para o início", href: inicioDoPapel(usuario.papel) }}
      />
    </main>
  );
}
