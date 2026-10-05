import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Segmentado } from "@/components/ui/Segmentado";
import { TabelaAtendimento } from "@/components/tecnico/TabelaAtendimento";
import { lerFiltro, lerModo, type FiltroResponsavel } from "@/components/tecnico/parametros";

export const metadata: Metadata = { title: "Atendimento" };

const FILTROS: { valor: FiltroResponsavel; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "meus", rotulo: "Só os meus" },
  { valor: "sem_responsavel", rotulo: "Sem responsável" },
];

function primeiro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

export default async function PaginaAtendimento({ searchParams }: PageProps<"/atendimento">) {
  const parametros = await searchParams;
  const modo = lerModo(primeiro(parametros.modo));
  const filtro = lerFiltro(primeiro(parametros.filtro));
  const busca = primeiro(parametros.busca) ?? "";

  if (modo === "quadro") {
    return (
      <Card className="mx-auto max-w-xl p-6 text-center">
        <h1 className="text-xl font-semibold">Quadro</h1>
        <p className="mt-2 text-texto-suave">
          O quadro com as colunas Novos, Em atendimento e Aguardando usuário chega na Entrega 3.
        </p>
        <Link
          href="/atendimento?modo=lista"
          className="mt-4 inline-flex min-h-11 items-center font-semibold text-primaria underline"
        >
          Ver em lista
        </Link>
      </Card>
    );
  }

  const hrefFiltro = (valor: FiltroResponsavel, manterBusca = true) => {
    const p = new URLSearchParams({ modo: "lista" });
    if (valor !== "todos") p.set("filtro", valor);
    if (busca && manterBusca) p.set("busca", busca);
    return `/atendimento?${p.toString()}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmentado
          rotuloAcessivel="Filtrar por responsável"
          valor={filtro}
          opcoes={FILTROS.map((f) => ({ ...f, href: hrefFiltro(f.valor) }))}
        />
        {busca ? (
          <p className="text-sm text-texto-suave">
            Buscando “{busca}” ·{" "}
            <Link
              href={hrefFiltro(filtro, false)}
              className="font-semibold text-primaria underline"
            >
              limpar
            </Link>
          </p>
        ) : null}
        <ul
          className="ml-auto flex items-center gap-4 text-xs text-texto-suave"
          aria-label="Legenda de prazo"
        >
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-perigo" /> Vencido
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-laranja" /> Vence em menos de 1h
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-sucesso" /> No prazo
          </li>
        </ul>
      </div>
      <TabelaAtendimento filtro={filtro} busca={busca} />
    </div>
  );
}
