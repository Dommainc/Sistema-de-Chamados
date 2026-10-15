import type { Metadata } from "next";
import { sair } from "@/app/acoes-sessao";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = { title: "Conta sem acesso" };

/** Conta Microsoft logada, mas sem acesso à Central: fora de @dommainc.com.br ou desativada (migration 0018). */
export default function PaginaContaSemAcesso() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <Card className="flex w-full max-w-md flex-col gap-4 p-6">
        <Logo />
        <h1 className="text-xl font-bold">Esta conta não tem acesso à Central</h1>
        <p className="text-texto-suave">
          Entre com a sua conta da DOMMA (<strong className="text-texto">@dommainc.com.br</strong>).
          Se você já usa essa conta e mesmo assim vê esta mensagem, fale com a TI.
        </p>
        <form action={sair}>
          <button
            type="submit"
            className="min-h-11 w-full rounded-xl bg-primaria px-4 font-semibold text-sobre-primaria hover:bg-primaria-forte"
          >
            Sair e entrar com outra conta
          </button>
        </form>
      </Card>
    </main>
  );
}
