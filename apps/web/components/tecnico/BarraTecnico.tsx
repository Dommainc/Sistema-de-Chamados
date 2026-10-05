"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { LinkNav } from "@/components/comum/LinkNav";
import { useConsulta } from "@/lib/dados/provedor";
import type { FonteDeDados } from "@/lib/dados/tipos";

const consultarContadores = (fonte: FonteDeDados) => fonte.obterContadores();

function Contador({ valor, perigo = false }: { valor: number | undefined; perigo?: boolean }) {
  if (valor === undefined) return null;
  return (
    <span
      className={`rounded-full px-2 text-sm font-semibold ${perigo ? "bg-perigo text-white" : "bg-white text-primaria"}`}
    >
      {valor}
    </span>
  );
}

/** Navegação da área técnica: Fila · Meus atendimentos · Todos · Abrir chamado, com contadores. */
export function BarraTecnico() {
  const caminho = usePathname();
  const aba = useSearchParams().get("aba") ?? "fila";
  const { dados: contadores } = useConsulta(consultarContadores);
  const naLista = caminho === "/atendimento";

  return (
    <nav aria-label="Área técnica" className="flex flex-wrap items-center gap-1">
      <LinkNav href="/atendimento" ativo={naLista && aba === "fila"}>
        Fila <Contador valor={contadores?.fila} />
      </LinkNav>
      <LinkNav href="/atendimento?aba=meus" ativo={naLista && aba === "meus"}>
        Meus atendimentos <Contador valor={contadores?.meusAtendimentos} />
      </LinkNav>
      <LinkNav href="/atendimento?aba=todos" ativo={naLista && aba === "todos"}>
        Todos
      </LinkNav>
      <LinkNav href="/atendimento/novo">Abrir chamado</LinkNav>
      {contadores && contadores.vencidos > 0 ? (
        <span className="ml-1 inline-flex min-h-11 items-center gap-2 px-2 text-sm">
          Vencidos <Contador valor={contadores.vencidos} perigo />
        </span>
      ) : null}
    </nav>
  );
}
