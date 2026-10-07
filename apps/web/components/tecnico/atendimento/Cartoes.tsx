"use client";

import { ChevronDown } from "lucide-react";
import type { PerfilPublico } from "@/lib/dados/tipos";
import type { EventoHistorico } from "@/lib/dominio/tipos";
import { formatarDataHora } from "@/lib/formato";
import { textoHistorico } from "@/components/chamado/linhaDoTempo";

/** Cartão branco com título em caixa alta (mockup, tela 7: AÇÕES, PRAZO, SOLICITANTE...). */
export function Secao({
  titulo,
  children,
  className = "",
}: {
  titulo: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={titulo}
      className={`flex flex-col gap-3 rounded-2xl border border-borda bg-superficie p-4 shadow-sm ${className}`}
    >
      <h2 className="text-xs font-semibold tracking-wider text-texto-suave uppercase">{titulo}</h2>
      {children}
    </section>
  );
}

export function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-texto-suave">{rotulo}</span>
      <span className="min-w-0 text-right break-words">{children}</span>
    </div>
  );
}

/**
 * HISTÓRICO completo (inclusive o que só a TI vê, em âmbar). Recolhido por padrão: o essencial já aparece
 * na conversa; aqui fica o registro para consulta.
 */
export function CartaoHistorico({
  historico,
  perfis,
  abertoNoInicio = false,
}: {
  historico: EventoHistorico[];
  perfis: PerfilPublico[];
  abertoNoInicio?: boolean;
}) {
  const nome = (id: string | null | undefined) =>
    id ? (perfis.find((p) => p.id === id)?.nome ?? null) : null;
  return (
    <section
      aria-label="Histórico"
      className="rounded-2xl border border-borda bg-superficie shadow-sm"
    >
      <details open={abertoNoInicio} className="group">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 text-xs font-semibold tracking-wider text-texto-suave uppercase">
          <span>
            Histórico <span className="normal-case">({historico.length})</span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-4 transition-transform group-open:rotate-180"
          />
        </summary>
        <ol className="flex flex-col gap-2 px-4 pb-4">
          {historico.map((h) => (
            <li key={h.id} className="flex justify-between gap-3 text-sm">
              <span className={h.publico ? "" : "text-alerta"}>
                {textoHistorico(h, nome)}
                {h.publico ? null : <span className="sr-only"> (só a TI vê)</span>}
              </span>
              <span className="shrink-0 text-texto-suave">
                {formatarDataHora(h.criadoEm).slice(0, 5)} {formatarDataHora(h.criadoEm).slice(11)}
              </span>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
