"use client";

import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import { Hourglass, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { BarraPrazo } from "@/components/ui/BarraPrazo";
import { Botao } from "@/components/ui/Botao";
import { EtiquetaId } from "@/components/ui/EtiquetaId";
import type { PerfilPublico } from "@/lib/dados/tipos";
import type { Chamado } from "@/lib/dominio/tipos";
import { formatarAtualizacao, tempoRelativo } from "@/lib/formato";
import { ehNovo, encerradoEm, urgenciaDoCartao, type ColunaQuadro, type Urgencia } from "./quadro";

export interface DadosCartao {
  chamado: Chamado;
  coluna: ColunaQuadro;
  solicitante: PerfilPublico | undefined;
  responsavel: PerfilPublico | undefined;
  assunto: string;
  naoLidas: number;
  /** Quem transferiu (para o selo "Transferido para você · por Thiago"). */
  transferidoPor: PerfilPublico | undefined;
}

/** O que o useDraggable (ColunaQuadro) entrega ao cartão para ele poder ser arrastado. */
export interface PropsArraste {
  ref: (elemento: HTMLElement | null) => void;
  atributos: DraggableAttributes;
  ouvintes: DraggableSyntheticListeners;
  /** Este cartão está sendo arrastado (o original fica esmaecido; o "fantasma" acompanha o dedo). */
  arrastando: boolean;
}

const primeiroNome = (p: PerfilPublico | undefined) => p?.nome.split(" ")[0] ?? "";

/** Uma cor por cartão: a do que mais precisa de ação (borda da esquerda + etiqueta do ID). */
export const COR_URGENCIA: Record<Urgencia, { borda: string; etiqueta: string; rotulo: string }> = {
  vencido: { borda: "border-l-perigo", etiqueta: "bg-perigo text-white", rotulo: "Prazo vencido" },
  mensagem_nova: {
    borda: "border-l-info",
    etiqueta: "bg-info text-white",
    rotulo: "Mensagem nova",
  },
  vence_em_breve: {
    borda: "border-l-laranja",
    etiqueta: "bg-laranja text-white",
    rotulo: "Vence em menos de 1 h",
  },
  sem_prazo: {
    borda: "border-l-alerta-borda",
    etiqueta: "bg-alerta-suave text-alerta",
    rotulo: "Sem prazo definido",
  },
  em_dia: { borda: "border-l-borda", etiqueta: "bg-superficie-2 text-texto-suave", rotulo: "" },
};

function NaoLidas({ total }: { total: number }) {
  if (total === 0) return null;
  return (
    <span
      title={`${total} mensagem(ns) nova(s)`}
      className="flex shrink-0 items-center gap-1 rounded-md bg-primaria-suave px-1.5 py-0.5 text-xs font-semibold text-primaria"
    >
      <MessageSquare aria-hidden="true" className="size-3.5" />
      {total}
    </span>
  );
}

/**
 * Cartão compacto das colunas Concluídos e Cancelados (estreitas, só leitura):
 * número, título e quando/por quê encerrou.
 */
function CartaoEncerrado({ dados, agora }: { dados: DadosCartao; agora: Date }) {
  const { chamado: c, coluna, responsavel } = dados;
  const cancelado = coluna === "cancelados";
  return (
    <article
      aria-label={`Chamado ${c.id}: ${c.titulo}`}
      className="flex flex-col gap-1 rounded-xl border border-borda bg-superficie px-3 py-2.5 shadow-sm"
    >
      <EtiquetaId numero={c.id} />
      <Link
        href={`/atendimento/${c.id}`}
        className="text-sm leading-snug font-semibold hover:underline"
      >
        {c.titulo}
      </Link>
      <p className={`text-xs font-semibold ${cancelado ? "text-apagado" : "text-sucesso"}`}>
        {cancelado ? "Cancelado" : "Concluído"} {formatarAtualizacao(encerradoEm(c), agora)}
        {!cancelado && responsavel ? (
          <span className="font-normal text-texto-suave"> · {primeiroNome(responsavel)}</span>
        ) : null}
      </p>
      {cancelado && c.motivoCancelamento ? (
        <p className="line-clamp-2 text-xs text-texto-suave">“{c.motivoCancelamento}”</p>
      ) : null}
    </article>
  );
}

/**
 * Cartão do quadro (mockup, tela 6): canhoto "Nº" colorido pelo PRAZO, selos, prazo com rótulo e, embaixo,
 * o que importa em cada coluna: Novos/Transferidos → Iniciar; Em atendimento → com quem está;
 * Aguardando → há quanto tempo espera o solicitante (pedido do dono, 2026-10-07: cartões "confundíveis").
 */
export function CartaoChamado({
  dados,
  euId,
  agora,
  destacado,
  aoAssumir,
  arraste,
  fantasma = false,
}: {
  dados: DadosCartao;
  euId: string;
  agora: Date;
  destacado: boolean;
  aoAssumir: (chamadoId: number) => void;
  /** Ausente = cartão parado (ex.: o "fantasma" que acompanha o arraste). */
  arraste?: PropsArraste;
  /** Cópia que segue o dedo/mouse enquanto arrasta. */
  fantasma?: boolean;
}) {
  const { chamado: c, coluna, solicitante, responsavel, assunto, naoLidas, transferidoPor } = dados;
  if (coluna === "concluidos" || coluna === "cancelados") {
    return <CartaoEncerrado dados={dados} agora={agora} />;
  }

  const urgencia = urgenciaDoCartao(c, naoLidas, agora);
  const cor = COR_URGENCIA[urgencia];
  const transferidoParaMim = c.status === "transferido" && c.responsavelId === euId;
  const podeIniciar = c.status === "pendente" || transferidoParaMim;
  const comQuem = responsavel?.id === euId ? "você" : primeiroNome(responsavel);

  return (
    <article
      ref={arraste?.ref}
      {...arraste?.atributos}
      {...arraste?.ouvintes}
      aria-label={`Chamado ${c.id}: ${c.titulo}`}
      className={`flex cursor-grab touch-manipulation flex-col gap-1.5 rounded-2xl border border-l-4 bg-superficie p-3 shadow-sm transition-shadow select-none hover:shadow-md focus-visible:outline-2 focus-visible:outline-primaria active:cursor-grabbing ${cor.borda} ${
        destacado ? "border-primaria ring-2 ring-primaria" : "border-borda"
      } ${arraste?.arrastando ? "opacity-40" : ""} ${fantasma ? "rotate-1 cursor-grabbing shadow-xl" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <EtiquetaId numero={c.id} tom={cor.etiqueta} />
        {cor.rotulo ? (
          <span
            className={`text-[11px] font-semibold ${urgencia === "sem_prazo" ? "text-alerta" : "text-texto-suave"}`}
          >
            {cor.rotulo}
          </span>
        ) : null}
      </div>
      {ehNovo(c, agora) || c.status === "transferido" ? (
        <div className="flex flex-wrap gap-1">
          {ehNovo(c, agora) ? (
            <span className="rounded-full bg-primaria px-2 py-0.5 text-[10px] font-bold tracking-wide text-sobre-primaria">
              NOVO
            </span>
          ) : null}
          {c.status === "transferido" ? (
            <span className="rounded-full bg-roxo-suave px-2 py-0.5 text-[11px] font-semibold text-roxo">
              {transferidoParaMim
                ? "Transferido para você"
                : `Transferido para ${primeiroNome(responsavel)}`}
              {transferidoPor ? ` · por ${primeiroNome(transferidoPor)}` : ""}
            </span>
          ) : null}
        </div>
      ) : null}
      <Link
        href={`/atendimento/${c.id}`}
        className="leading-snug font-semibold hover:underline"
        draggable={false}
      >
        {c.titulo}
      </Link>
      <p className="truncate text-xs text-texto-suave">
        {solicitante?.nome ?? "—"} · {assunto}
      </p>

      {coluna === "em_atendimento" && responsavel ? (
        <p className="flex items-center gap-1.5 text-sm">
          <Avatar
            nome={responsavel.nome}
            tamanho="pequeno"
            tom={responsavel.id === euId ? "escuro" : "suave"}
          />
          <span>
            Com <strong>{comQuem}</strong>
          </span>
          <span className="ml-auto">
            <NaoLidas total={naoLidas} />
          </span>
        </p>
      ) : null}
      {coluna === "aguardando" ? (
        <p className="flex items-center gap-1.5 text-sm text-alerta">
          <Hourglass aria-hidden="true" className="size-4 shrink-0" />
          <span className="min-w-0 leading-snug">
            Esperando <strong>{primeiroNome(solicitante) || "o solicitante"}</strong>{" "}
            {tempoRelativo(c.atualizadoEm, agora)}
          </span>
          <span className="ml-auto">
            <NaoLidas total={naoLidas} />
          </span>
        </p>
      ) : null}

      {coluna === "transferidos" && !transferidoParaMim ? (
        <p className="text-sm text-texto-suave">
          Aguardando <strong className="text-texto">{primeiroNome(responsavel)}</strong> iniciar
        </p>
      ) : null}

      {/* Prazo numa linha só e, embaixo, o botão na largura do cartão (6 colunas lado a lado). */}
      <div className="mt-1 flex flex-col gap-2">
        <BarraPrazo
          criadoEm={c.criadoEm}
          prazo={c.prazoSla}
          agora={agora}
          comRotulo
          semBarra
          acao={coluna === "novos" && naoLidas > 0 ? <NaoLidas total={naoLidas} /> : null}
        />
        {(coluna === "novos" || coluna === "transferidos") && podeIniciar ? (
          <Botao
            variante="escuro"
            larguraTotal
            className="min-h-10 text-sm"
            onClick={() => aoAssumir(c.id)}
          >
            Iniciar
          </Botao>
        ) : null}
      </div>
    </article>
  );
}
