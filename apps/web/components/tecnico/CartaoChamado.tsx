"use client";

import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import { Clock, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import type { OpcaoSistema, PerfilPublico } from "@/lib/dados/tipos";
import type { Chamado } from "@/lib/dominio/tipos";
import { tempoRelativo } from "@/lib/formato";
import { situacaoPrazo, textoPrazoCartao } from "@/lib/prazo";
import { SEM_SISTEMA } from "@/lib/sistemas";
import { COR_PRIORIDADE } from "./cores";
import { encerradoEm, type ColunaQuadro } from "./quadro";

export interface DadosCartao {
  chamado: Chamado;
  coluna: ColunaQuadro;
  solicitante: PerfilPublico | undefined;
  responsavel: PerfilPublico | undefined;
  assunto: string;
  naoLidas: number;
  /** Quem transferiu (para "Transferido para você · por Thiago"). */
  transferidoPor: PerfilPublico | undefined;
  /** Resposta de "Qual sistema?" (null = categoria sem sistema). Sem cor no cartão (ata, item 07). */
  sistema: (OpcaoSistema & { modulo?: string | null }) | null;
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

function Prioridade({ chamado }: { chamado: Chamado }) {
  const cor = COR_PRIORIDADE[chamado.prioridade];
  if (!cor) return null;
  return (
    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold ${cor.classe}`}>
      {cor.rotulo}
    </span>
  );
}

/** Rodapé: quando (prazo, espera ou encerramento) à esquerda; mensagens novas e quem atende à direita. */
/**
 * O "tempo" do chamado, igual no cartão e na Lista: Concluído/Cancelado há…, Aguardando há…, Aberto há… (antes
 * de iniciar não há prazo — ADR 0012) ou o prazo ("Vence em 3h 10min" · "Atrasado 35min").
 */
export function tempoDoChamado(
  coluna: ColunaQuadro,
  c: Chamado,
  agora: Date,
): { texto: string; atrasado: boolean } {
  if (coluna === "concluidos")
    return { texto: `Concluído ${tempoRelativo(encerradoEm(c), agora)}`, atrasado: false };
  if (coluna === "cancelados")
    return { texto: `Cancelado ${tempoRelativo(encerradoEm(c), agora)}`, atrasado: false };
  if (coluna === "aguardando")
    return { texto: `Aguardando ${tempoRelativo(c.atualizadoEm, agora)}`, atrasado: false };
  if (coluna === "novos" || coluna === "transferidos")
    return { texto: `Aberto ${tempoRelativo(c.criadoEm, agora)}`, atrasado: false };
  return {
    texto: textoPrazoCartao(c.prazoSla, agora),
    atrasado: situacaoPrazo(c.prazoSla, agora) === "vencido",
  };
}

function Rodape({ dados, agora, euId }: { dados: DadosCartao; agora: Date; euId: string }) {
  const { chamado: c, coluna, responsavel, naoLidas } = dados;
  const tempo = tempoDoChamado(coluna, c, agora);
  const quando = (
    <span className={tempo.atrasado ? "font-bold text-texto" : ""}>{tempo.texto}</span>
  );
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 border-t border-borda pt-2.5 text-xs text-texto-suave">
      <span className="flex items-center gap-1.5">
        <Clock aria-hidden="true" className="size-3.5 shrink-0" />
        <span>{quando}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {naoLidas > 0 ? (
          <span
            title={`${naoLidas} mensagem(ns) nova(s)`}
            className="flex items-center gap-1 font-semibold text-texto"
          >
            <MessageSquare aria-hidden="true" className="size-3.5" />
            {naoLidas}
          </span>
        ) : null}
        {responsavel ? (
          <span title={responsavel.id === euId ? "Você" : responsavel.nome}>
            <Avatar nome={responsavel.nome} tamanho="pequeno" tom="suave" />
            <span className="sr-only">
              Com {responsavel.id === euId ? "você" : responsavel.nome}
            </span>
          </span>
        ) : coluna === "novos" ? (
          <span className="rounded-full border border-dashed border-borda px-2 py-0.5">
            Sem responsável
          </span>
        ) : null}
      </span>
    </div>
  );
}

/**
 * Cartão do quadro no visual neutro (layout novo e ata de 26/10/2026): branco, sem cor de status nem de
 * sistema. Em cima, número e prioridade (já na triagem — ADR 0020); título; solicitante · assunto;
 * rodapé com o prazo ("Atrasado 35min" em negrito), mensagens novas e quem atende.
 */
export function CartaoChamado({
  dados,
  euId,
  agora,
  destacado,
  arraste,
  fantasma = false,
}: {
  dados: DadosCartao;
  euId: string;
  agora: Date;
  destacado: boolean;
  /** Ausente = cartão parado (ex.: encerrados e o "fantasma" que acompanha o arraste). */
  arraste?: PropsArraste;
  /** Cópia que segue o dedo/mouse enquanto arrasta. */
  fantasma?: boolean;
}) {
  const { chamado: c, coluna, solicitante, responsavel, assunto, transferidoPor } = dados;
  const encerrado = coluna === "concluidos" || coluna === "cancelados";
  const sistema = dados.sistema && dados.sistema.nome !== SEM_SISTEMA ? dados.sistema : null;
  const transferidoParaMim = c.status === "transferido" && c.responsavelId === euId;

  return (
    <article
      ref={arraste?.ref}
      {...arraste?.atributos}
      {...arraste?.ouvintes}
      aria-label={`Chamado ${c.id}: ${c.titulo}`}
      className={`flex flex-col gap-2 rounded-xl border bg-superficie p-3.5 shadow-sm transition-shadow select-none hover:shadow-md focus-visible:outline-2 focus-visible:outline-primaria ${
        arraste ? "cursor-grab touch-manipulation active:cursor-grabbing" : ""
      } ${destacado ? "border-primaria ring-2 ring-primaria" : "border-borda"} ${
        encerrado ? "opacity-80" : ""
      } ${arraste?.arrastando ? "opacity-40" : ""} ${fantasma ? "rotate-1 cursor-grabbing shadow-xl" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-semibold text-texto-suave">ID {c.id}</span>
        <Prioridade chamado={c} />
      </div>

      <Link
        href={`/atendimento/${c.id}`}
        className="text-[15px] leading-snug font-bold hover:underline"
        draggable={false}
      >
        {c.titulo}
      </Link>
      <p className="text-[13px] leading-snug text-texto-suave">
        {solicitante?.nome ?? "—"} · {sistema ? sistema.nome : assunto}
        {sistema?.modulo ? ` · ${sistema.modulo}` : ""}
      </p>

      {c.status === "transferido" ? (
        <p className="text-xs font-semibold text-texto">
          {transferidoParaMim ? "Transferido para você" : `Para ${primeiroNome(responsavel)}`}
          {transferidoPor ? ` · por ${primeiroNome(transferidoPor)}` : ""}
        </p>
      ) : null}
      {coluna === "cancelados" && c.motivoCancelamento ? (
        <p className="line-clamp-2 text-xs text-texto-suave">“{c.motivoCancelamento}”</p>
      ) : null}

      <Rodape dados={dados} agora={agora} euId={euId} />
    </article>
  );
}
