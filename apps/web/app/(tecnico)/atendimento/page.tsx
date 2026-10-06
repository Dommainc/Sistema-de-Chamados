import type { Metadata } from "next";
import Link from "next/link";
import { Segmentado } from "@/components/ui/Segmentado";
import { Legenda } from "@/components/tecnico/FiltrosQuadro";
import { QuadroAtendimento } from "@/components/tecnico/QuadroAtendimento";
import { TabelaAtendimento } from "@/components/tecnico/TabelaAtendimento";
import {
  lerCategoria,
  lerFiltro,
  lerModo,
  lerPrazo,
  type FiltroResponsavel,
} from "@/components/tecnico/parametros";

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

  if (modo === "quadro") {
    return (
      <QuadroAtendimento
        filtros={{
          responsavel: filtro,
          categoriaId: lerCategoria(primeiro(parametros.categoria)),
          prazo: lerPrazo(primeiro(parametros.prazo)),
        }}
      />
    );
  }

  const busca = primeiro(parametros.busca) ?? "";
  const encerrados = primeiro(parametros.encerrados) === "1";
  const hrefFiltro = (valor: FiltroResponsavel, manterBusca = true) => {
    const p = new URLSearchParams({ modo: "lista" });
    if (valor !== "todos") p.set("filtro", valor);
    if (busca && manterBusca) p.set("busca", busca);
    if (encerrados) p.set("encerrados", "1");
    return `/atendimento?${p.toString()}`;
  };

  return (
    <div className="flex flex-col gap-4">
      {encerrados ? (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-bold">Chamados encerrados</h1>
          <Link href="/atendimento" className="font-semibold text-primaria underline">
            Voltar ao quadro
          </Link>
        </div>
      ) : null}
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
        {encerrados ? null : (
          <div className="ml-auto">
            <Legenda />
          </div>
        )}
      </div>
      <TabelaAtendimento filtro={filtro} busca={busca} encerrados={encerrados} />
    </div>
  );
}
