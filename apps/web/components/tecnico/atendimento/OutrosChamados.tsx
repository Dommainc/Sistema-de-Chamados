"use client";

import Link from "next/link";
import { useCallback } from "react";
import { BadgeStatus } from "@/components/ui/BadgeStatus";
import { useConsulta } from "@/lib/dados/provedor";
import type { FonteDeDados } from "@/lib/dados/tipos";
import { formatarDataHora, formatarNumeroChamado } from "@/lib/formato";
import { Secao } from "./Cartoes";

/**
 * Últimos chamados do mesmo solicitante (dono, 2026-10-18): o técnico vê na hora se o problema é
 * recorrente ("é o 3º chamado da impressora dela"). Só a TI.
 */
export function OutrosChamados({
  chamadoId,
  solicitanteId,
  nome,
}: {
  chamadoId: number;
  solicitanteId: string;
  nome: string;
}) {
  const consultar = useCallback(
    (f: FonteDeDados) => f.listarChamadosDoSolicitante(solicitanteId, chamadoId),
    [solicitanteId, chamadoId],
  );
  const { dados } = useConsulta(consultar);
  const primeiro = nome.split(" ")[0];
  return (
    <Secao titulo={`Outros chamados de ${primeiro}`}>
      {dados === undefined ? (
        <p className="text-sm text-texto-suave">Carregando...</p>
      ) : dados.length === 0 ? (
        <p className="text-sm text-texto-suave">É o primeiro chamado de {primeiro}.</p>
      ) : (
        <ul className="-my-1 flex flex-col">
          {dados.map((c) => (
            <li key={c.id}>
              <Link
                href={`/atendimento/${c.id}`}
                className="flex flex-col gap-1 rounded-lg px-1 py-2 hover:bg-fundo"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">
                    <span className="font-mono text-texto-suave">
                      {formatarNumeroChamado(c.id)}
                    </span>{" "}
                    {c.titulo}
                  </span>
                  <BadgeStatus status={c.status} papel="ti" tamanho="pequeno" />
                </span>
                <span className="text-xs text-texto-suave">
                  Aberto em {formatarDataHora(c.criadoEm)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Secao>
  );
}
