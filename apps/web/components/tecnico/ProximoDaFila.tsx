"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Botao } from "@/components/ui/Botao";
import type { PerfilPublico } from "@/lib/dados/tipos";
import type { Chamado } from "@/lib/dominio/tipos";
import { formatarNumeroChamado } from "@/lib/formato";
import { situacaoPrazo, textoPrazo } from "@/lib/prazo";

const TOM_PRAZO = {
  vencido: "bg-perigo-suave text-perigo",
  vence_em_breve: "bg-laranja-suave text-alerta",
  no_prazo: "bg-sucesso-suave text-sucesso",
  sem_prazo: "bg-superficie-2 text-texto-suave",
} as const;

/** Faixa "PRÓXIMO DA FILA" com "Iniciar o próximo" (mockup, telas 6 e 8), numa linha só no computador. */
export function ProximoDaFila({
  chamado,
  solicitante,
  agora,
  pegando,
  aoPegar,
}: {
  chamado: Chamado | null;
  solicitante: PerfilPublico | undefined;
  agora: Date;
  pegando: boolean;
  aoPegar: () => void;
}) {
  if (!chamado) {
    return (
      <div className="rounded-2xl border border-borda bg-superficie px-5 py-4 text-texto-suave shadow-sm">
        Fila vazia: nenhum chamado esperando um técnico. 🎉
      </div>
    );
  }
  const situacao = situacaoPrazo(chamado.prazoSla, agora);
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-borda bg-superficie px-4 py-3 shadow-sm md:flex-row md:items-center md:gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1 md:flex-row md:items-center md:gap-3">
        <div className="flex shrink-0 items-center justify-between gap-3 md:justify-start">
          <p className="text-xs font-bold tracking-wider text-texto-suave uppercase">
            Próximo da fila
          </p>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TOM_PRAZO[situacao]}`}
          >
            {textoPrazo(chamado.prazoSla, agora)}
          </span>
        </div>
        <Link href={`/atendimento/${chamado.id}`} className="truncate hover:underline">
          <span className="font-mono font-semibold text-primaria">
            {formatarNumeroChamado(chamado.id)}
          </span>{" "}
          <span className="font-semibold">{chamado.titulo}</span>
          {solicitante ? (
            <span className="text-texto-suave">
              {" "}
              · {solicitante.nome}
              {solicitante.departamento ? `, ${solicitante.departamento}` : ""}
            </span>
          ) : null}
        </Link>
      </div>
      <Botao onClick={aoPegar} carregando={pegando} className="min-h-10 shrink-0 md:px-5">
        Iniciar o próximo <ArrowRight aria-hidden="true" className="size-4" />
      </Botao>
    </div>
  );
}
