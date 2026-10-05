import { TelaMensagem } from "@/components/comum/TelaMensagem";

export default function NaoEncontrado() {
  return (
    <main className="flex flex-1">
      <TelaMensagem
        titulo="Página não encontrada"
        texto="O endereço que você abriu não existe. Confira o link ou volte para o início."
        acao={{ rotulo: "Voltar para o início", href: "/" }}
      />
    </main>
  );
}
