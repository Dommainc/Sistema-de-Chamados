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
import type { PerfilPublico } from "@/lib/dados/tipos";
import { useUsuario } from "@/lib/dados/provedor";
import { acoesDisponiveis } from "@/lib/dominio/estados";
import { estaEncerrado, type Chamado } from "@/lib/dominio/tipos";
import { formatarNumeroChamado, formatarQuando } from "@/lib/formato";

/**
 * Andamento, técnico, previsão, detalhes e cancelar. No celular fica acima do chat (mockup, tela 5);
 * no computador vira um painel ao lado do chat, com os detalhes do pedido sempre abertos.
 */
function PainelChamado({
  chamado,
  responsavel,
  podeCancelar,
  aoCancelar,
  detalhesSempreAbertos,
}: {
  chamado: Chamado;
  responsavel: PerfilPublico | null;
  podeCancelar: boolean;
  aoCancelar: () => void;
  detalhesSempreAbertos: boolean;
}) {
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);
  const primeiroNomeTecnico = responsavel?.nome.split(" ")[0] ?? "O técnico";
  const mostrarDetalhes = detalhesSempreAbertos || detalhesAbertos;

  return (
    <div className="flex flex-col gap-4">
      {chamado.status === "cancelado" ? (
        <div>
          <BadgeStatus status={chamado.status} papel="solicitante" />
        </div>
      ) : (
        <BarraProgresso status={chamado.status} />
      )}

      {chamado.status === "aguardando_usuario" ? (
        <Aviso titulo={`${primeiroNomeTecnico} está esperando sua resposta.`}>
          Responda {detalhesSempreAbertos ? "na conversa" : "abaixo"} para ele continuar.
        </Aviso>
      ) : null}

      <div className="flex flex-wrap justify-between gap-2 border-b border-borda pb-3 text-sm">
        <span className="text-texto-suave">
          Técnico:{" "}
          <strong className="text-texto">{responsavel?.nome ?? "ainda não definido"}</strong>
        </span>
        {!estaEncerrado(chamado.status) ? (
          <span className="text-texto-suave">
            Previsão:{" "}
            <strong className="text-texto">
              {chamado.prazoSla ? formatarQuando(chamado.prazoSla) : "a TI vai informar"}
            </strong>
          </span>
        ) : null}
      </div>

      {detalhesSempreAbertos ? (
        <p className="text-xs font-semibold tracking-wider text-texto-suave uppercase">
          Detalhes do pedido
        </p>
      ) : (
        <button
          type="button"
          aria-expanded={detalhesAbertos}
          onClick={() => setDetalhesAbertos((v) => !v)}
          className="inline-flex min-h-11 items-center gap-1 self-start font-semibold text-primaria"
        >
          {detalhesAbertos ? "Esconder detalhes do pedido" : "Ver detalhes do pedido"}
          <ChevronDown
            aria-hidden="true"
            className={`size-5 transition-transform ${detalhesAbertos ? "rotate-180" : ""}`}
          />
        </button>
      )}
      {mostrarDetalhes ? <DetalhesPedido chamado={chamado} /> : null}

      {chamado.status === "cancelado" && chamado.motivoCancelamento ? (
        <p className="text-sm text-texto-suave">
          Motivo do cancelamento: {chamado.motivoCancelamento}
        </p>
      ) : null}

      {podeCancelar ? (
        <button
          type="button"
          onClick={aoCancelar}
          className="inline-flex min-h-11 items-center self-start font-semibold text-perigo"
        >
          Cancelar chamado
        </button>
      ) : null}
    </div>
  );
}

/** /meus-chamados/[id] — o chat é o centro da tela (mockup, tela 5). */
export function DetalheChamadoSolicitante({ id }: { id: number }) {
  const usuario = useUsuario();
  const { dados, erro, carregando } = useChamadoDetalhado(id);
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
  const painel = {
    chamado,
    responsavel,
    podeCancelar: acoesDisponiveis(chamado, usuario).includes("cancelar"),
    aoCancelar: () => setCancelando(true),
  };

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-borda bg-superficie">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pt-2 pb-4 md:px-8">
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
            <h1 className="text-2xl font-bold lg:text-3xl">{chamado.titulo}</h1>
          </div>

          <div className="lg:hidden">
            <PainelChamado {...painel} detalhesSempreAbertos={false} />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6 lg:px-8 lg:py-6">
        <section
          aria-label="Conversa"
          className="flex flex-1 flex-col lg:min-h-[32rem] lg:overflow-hidden lg:rounded-2xl lg:border lg:border-borda lg:bg-fundo"
        >
          <ChatChamado chamadoId={chamado.id} />
        </section>
        <aside className="sticky top-6 hidden rounded-2xl border border-borda bg-superficie p-5 shadow-sm lg:block">
          <PainelChamado {...painel} detalhesSempreAbertos />
        </aside>
      </div>

      <ModalCancelar
        chamadoId={chamado.id}
        aberto={cancelando}
        aoFechar={() => setCancelando(false)}
      />
    </div>
  );
}
