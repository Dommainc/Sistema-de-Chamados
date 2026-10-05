"use client";

import Link from "next/link";
import { useConsulta } from "@/lib/dados/provedor";
import type { FonteDeDados } from "@/lib/dados/tipos";
import { formatarNumeroChamado } from "@/lib/formato";

const consultarEmAndamento = (fonte: FonteDeDados) =>
  fonte.listarChamados({ escopo: "meus", encerrados: false });

/** "O técnico está esperando sua resposta no chamado #42 → Responder". */
export function AvisoAguardandoResposta() {
  const { dados } = useConsulta(consultarEmAndamento);
  const aguardando = dados?.filter((c) => c.status === "aguardando_usuario") ?? [];
  if (aguardando.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {aguardando.map((c) => (
        <Link
          key={c.id}
          href={`/meus-chamados/${c.id}`}
          className="flex min-h-11 items-center justify-between gap-3 rounded-lg border-2 border-alerta bg-alerta-suave px-4 py-3 text-alerta"
        >
          <span>
            O técnico está esperando sua resposta no chamado{" "}
            <strong>{formatarNumeroChamado(c.id)}</strong>
          </span>
          <span className="font-semibold whitespace-nowrap">Responder →</span>
        </Link>
      ))}
    </div>
  );
}
