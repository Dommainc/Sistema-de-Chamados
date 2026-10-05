"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { BadgeStatus } from "@/components/ui/BadgeStatus";
import { useConsulta } from "@/lib/dados/provedor";
import type { FonteDeDados } from "@/lib/dados/tipos";
import { formatarNumeroChamado, tempoRelativo } from "@/lib/formato";

type Aba = "andamento" | "encerrados";

const ABAS: readonly [Aba, string][] = [
  ["andamento", "Em andamento"],
  ["encerrados", "Encerrados"],
];

export function ListaMeusChamados() {
  const [aba, setAba] = useState<Aba>("andamento");
  const consultar = useCallback(
    (fonte: FonteDeDados) =>
      fonte.listarChamados({ escopo: "meus", encerrados: aba === "encerrados" }),
    [aba],
  );
  const { dados: chamados, erro, carregando } = useConsulta(consultar);

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Filtrar chamados" className="flex gap-2">
        {ABAS.map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={aba === valor}
            onClick={() => setAba(valor)}
            className={`min-h-11 rounded-lg px-4 font-medium ${aba === valor ? "bg-primaria text-sobre-primaria" : "border border-borda bg-superficie"}`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {carregando ? <p className="text-texto-suave">Carregando...</p> : null}
      {erro ? <p className="text-perigo">{erro.message}</p> : null}
      {chamados && chamados.length === 0 ? (
        <p className="text-texto-suave">
          {aba === "andamento"
            ? "Você não tem chamados em andamento."
            : "Nenhum chamado encerrado."}
        </p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {chamados?.map((c) => (
          <li key={c.id}>
            <Link
              href={`/meus-chamados/${c.id}`}
              className="flex flex-col gap-2 rounded-xl border border-borda bg-superficie p-4 shadow-sm hover:border-primaria"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-texto-suave">
                  Chamado {formatarNumeroChamado(c.id)}
                </span>
                <BadgeStatus status={c.status} papel="solicitante" />
              </div>
              <span className="font-medium">{c.titulo}</span>
              <span className="text-sm text-texto-suave">
                Atualizado {tempoRelativo(c.atualizadoEm)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
