"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { TelaMensagem } from "@/components/comum/TelaMensagem";
import { useChamadoDetalhado } from "@/components/comum/useChamadoDetalhado";
import { Aviso } from "@/components/ui/Aviso";
import { BadgeStatus } from "@/components/ui/BadgeStatus";
import { BarraProgresso } from "@/components/ui/BarraProgresso";
import { estaEncerrado } from "@/lib/dominio/tipos";
import { formatarNumeroChamado, formatarQuando } from "@/lib/formato";

/**
 * Cabeçalho do /meus-chamados/[id] no visual do mockup (tela 5).
 * Chat, "Ver detalhes do pedido" e as ações chegam na Entrega 2.
 */
export function DetalheChamadoSolicitante({ id }: { id: number }) {
  const { dados, erro, carregando } = useChamadoDetalhado(id);

  if (carregando) return <p className="text-texto-suave">Carregando...</p>;
  if (erro || !dados) {
    return (
      <TelaMensagem
        titulo="Sem acesso"
        texto={erro?.message ?? ""}
        acao={{ rotulo: "Ver meus chamados", href: "/meus-chamados" }}
      />
    );
  }

  const { chamado, responsavel } = dados;
  const primeiroNomeTecnico = responsavel?.nome.split(" ")[0] ?? "O técnico";

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/meus-chamados"
        className="inline-flex min-h-11 items-center gap-1 self-start font-semibold text-primaria"
      >
        <ChevronLeft aria-hidden="true" className="size-5" /> Meus chamados
      </Link>

      <div className="flex flex-col gap-1">
        <p className="font-mono text-sm font-semibold text-texto-suave">
          Chamado {formatarNumeroChamado(chamado.id)}
        </p>
        <h1 className="text-2xl font-bold">{chamado.titulo}</h1>
      </div>

      {chamado.status === "cancelado" ? (
        <div>
          <BadgeStatus status={chamado.status} papel="solicitante" />
        </div>
      ) : (
        <BarraProgresso status={chamado.status} />
      )}

      {chamado.status === "aguardando_usuario" ? (
        <Aviso titulo={`${primeiroNomeTecnico} está esperando sua resposta.`}>
          Responda abaixo para ele continuar.
        </Aviso>
      ) : null}

      <div className="flex flex-wrap justify-between gap-2 border-b border-borda pb-3 text-sm">
        <span className="text-texto-suave">
          Técnico:{" "}
          <strong className="text-texto">{responsavel?.nome ?? "ainda não definido"}</strong>
        </span>
        {!estaEncerrado(chamado.status) ? (
          <span className="text-texto-suave">
            Previsão: <strong className="text-texto">{formatarQuando(chamado.prazoSla)}</strong>
          </span>
        ) : null}
      </div>

      <p className="rounded-2xl border border-dashed border-borda p-6 text-center text-sm text-texto-suave">
        A conversa com a TI aparece aqui na próxima entrega.
      </p>
    </div>
  );
}
