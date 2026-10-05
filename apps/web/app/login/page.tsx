import type { Metadata } from "next";
import { entrarSimulado } from "@/app/acoes-sessao";
import { Card } from "@/components/ui/Card";
import { FONTE_DADOS } from "@/lib/dados/config";
import { USUARIOS_SIMULADOS } from "@/lib/dados/simulada/usuarios";

export const metadata: Metadata = { title: "Entrar" };

const DESCRICAO_PAPEL = { solicitante: "Solicitante", ti: "Equipe de TI" } as const;

export default function PaginaLogin() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <Card className="flex w-full max-w-md flex-col gap-6 p-6">
        <div className="text-center">
          <p className="text-sm font-semibold tracking-wide text-primaria uppercase">DOMMA</p>
          <h1 className="mt-1 text-2xl font-semibold">Central de Chamados</h1>
          <p className="mt-2 text-texto-suave">Peça ajuda para a TI e acompanhe seus pedidos.</p>
        </div>

        {FONTE_DADOS === "simulada" ? (
          <div className="flex flex-col gap-3">
            <h2 className="font-medium">Entrar como:</h2>
            {USUARIOS_SIMULADOS.map((u) => (
              <form key={u.id} action={entrarSimulado}>
                <input type="hidden" name="usuarioId" value={u.id} />
                <button
                  type="submit"
                  className="flex min-h-14 w-full items-center justify-between rounded-lg border border-borda bg-superficie px-4 py-2 text-left hover:border-primaria hover:bg-primaria-suave"
                >
                  <span className="font-medium">{u.nome}</span>
                  <span className="text-sm text-texto-suave">{DESCRICAO_PAPEL[u.papel]}</span>
                </button>
              </form>
            ))}
          </div>
        ) : (
          <p className="text-center text-texto-suave">
            O login com a conta Microsoft estará disponível em breve.
          </p>
        )}
      </Card>
    </main>
  );
}
