"use client";

import { ChevronDown, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ChatChamado } from "@/components/chamado/ChatChamado";
import { DetalhesPedido } from "@/components/chamado/DetalhesPedido";
import { ModalCancelar } from "@/components/chamado/ModalCancelar";
import { TelaMensagem } from "@/components/comum/TelaMensagem";
import { useChamadoDetalhado } from "@/components/comum/useChamadoDetalhado";
import { Aviso } from "@/components/ui/Aviso";
import { BadgeStatus } from "@/components/ui/BadgeStatus";
import { BarraProgresso } from "@/components/ui/BarraProgresso";
import { useUsuario } from "@/lib/dados/provedor";
import { acoesDisponiveis } from "@/lib/dominio/estados";
import { estaEncerrado } from "@/lib/dominio/tipos";
import { formatarNumeroChamado, formatarQuando } from "@/lib/formato";

/** /meus-chamados/[id] — o chat é o centro da tela (mockup, tela 5). */
export function DetalheChamadoSolicitante({ id }: { id: number }) {
  const usuario = useUsuario();
  const { dados, erro, carregando } = useChamadoDetalhado(id);
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  if (carregando) return <p className="p-6 text-texto-suave">Carregando...</p>;
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
  const podeCancelar = acoesDisponiveis(chamado, usuario).includes("cancelar");

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-borda bg-superficie">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-2 pb-4">
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

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              aria-expanded={detalhesAbertos}
              onClick={() => setDetalhesAbertos((v) => !v)}
              className="inline-flex min-h-11 items-center gap-1 font-semibold text-primaria"
            >
              {detalhesAbertos ? "Esconder detalhes do pedido" : "Ver detalhes do pedido"}
              <ChevronDown
                aria-hidden="true"
                className={`size-5 transition-transform ${detalhesAbertos ? "rotate-180" : ""}`}
              />
            </button>
            {podeCancelar ? (
              <button
                type="button"
                onClick={() => setCancelando(true)}
                className="inline-flex min-h-11 items-center font-semibold text-perigo"
              >
                Cancelar chamado
              </button>
            ) : null}
          </div>
          {detalhesAbertos ? <DetalhesPedido chamado={chamado} /> : null}
          {chamado.status === "cancelado" && chamado.motivoCancelamento ? (
            <p className="text-sm text-texto-suave">
              Motivo do cancelamento: {chamado.motivoCancelamento}
            </p>
          ) : null}
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        <ChatChamado chamadoId={chamado.id} />
      </div>

      <ModalCancelar
        chamadoId={chamado.id}
        aberto={cancelando}
        aoFechar={() => setCancelando(false)}
      />
    </div>
  );
}
