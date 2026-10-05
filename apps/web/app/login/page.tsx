import type { Metadata } from "next";
import { entrarSimulado } from "@/app/acoes-sessao";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";
import { FONTE_DADOS } from "@/lib/dados/config";
import { USUARIOS_SIMULADOS } from "@/lib/dados/simulada/usuarios";

export const metadata: Metadata = { title: "Entrar" };

const DESCRICAO_PAPEL = { solicitante: "Solicitante", ti: "Equipe de TI" } as const;

export default function PaginaLogin() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <Card className="flex w-full max-w-md flex-col gap-6 p-6">
        <div className="flex flex-col gap-3">
          <Logo subtitulo="Central de Chamados" />
          <p className="text-texto-suave">Peça ajuda para a TI e acompanhe seus pedidos.</p>
        </div>

        {FONTE_DADOS === "simulada" ? (
          <div className="flex flex-col gap-3">
            {/* Tela provisória do modo de demonstração (ADR 0006). O login real é com a conta Microsoft. */}
            <h1 className="font-semibold">Entrar como:</h1>
            {USUARIOS_SIMULADOS.map((u) => (
              <form key={u.id} action={entrarSimulado}>
                <input type="hidden" name="usuarioId" value={u.id} />
                <button
                  type="submit"
                  className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-borda bg-superficie px-4 py-2 text-left hover:border-primaria hover:bg-primaria-suave"
                >
                  <Avatar nome={u.nome} tom={u.papel === "ti" ? "escuro" : "primaria"} />
                  <span className="flex flex-col">
                    <span className="font-semibold">{u.nome}</span>
                    <span className="text-sm text-texto-suave">{DESCRICAO_PAPEL[u.papel]}</span>
                  </span>
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
