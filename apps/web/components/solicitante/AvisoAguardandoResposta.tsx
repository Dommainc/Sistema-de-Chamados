"use client";

import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { Aviso } from "@/components/ui/Aviso";
import { useConsulta } from "@/lib/dados/provedor";
import type { FonteDeDados } from "@/lib/dados/tipos";
import { formatarNumeroChamado } from "@/lib/formato";

const consultarAguardando = async (fonte: FonteDeDados) =>
  (await fonte.listarChamados({ escopo: "meus", encerrados: false })).filter(
    (c) => c.status === "aguardando_usuario",
  );

/** Faixa âmbar do topo do portal (mockup, tela 1). */
export function AvisoAguardandoResposta() {
  const { dados: aguardando } = useConsulta(consultarAguardando);
  if (!aguardando || aguardando.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {aguardando.map((c) => (
        <Aviso
          key={c.id}
          icone={MessageSquare}
          titulo="O técnico está esperando sua resposta"
          acao={
            <Link
              href={`/meus-chamados/${c.id}`}
              className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2"
            >
              Responder
            </Link>
          }
        >
          Chamado {formatarNumeroChamado(c.id)} · {c.titulo}
        </Aviso>
      ))}
    </div>
  );
}
