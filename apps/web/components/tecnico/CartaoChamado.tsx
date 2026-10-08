"use client";

import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import { Hourglass, MessageSquare, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { EtiquetaId } from "@/components/ui/EtiquetaId";
import type { OpcaoSistema, PerfilPublico } from "@/lib/dados/tipos";
import type { Chamado } from "@/lib/dominio/tipos";
import { formatarAtualizacao, tempoRelativo } from "@/lib/formato";
import { situacaoPrazo, textoPrazo } from "@/lib/prazo";
import { classesDaCor, SEM_SISTEMA } from "@/lib/sistemas";
import { COR_PRAZO, COR_STATUS } from "./cores";
import { ehNovo, encerradoEm, type ColunaQuadro } from "./quadro";

export interface DadosCartao {
  chamado: Chamado;
  coluna: ColunaQuadro;
  solicitante: PerfilPublico | undefined;
  responsavel: PerfilPublico | undefined;
  assunto: string;
  naoLidas: number;
  /** Quem transferiu (para o selo "Transferido para você · por Thiago"). */
  transferidoPor: PerfilPublico | undefined;
  /** Resposta de "Qual sistema?" com a cor do banco (null = categoria sem sistema). */
  sistema: OpcaoSistema | null;
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

/** Etiqueta "ID 36" na cor própria (verde-água), igual em todos os cartões. */
const TOM_ID = "bg-id-suave text-id";

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

/** Retângulo do prazo: só ele leva a cor do prazo (vencido vermelho, sem prazo amarelo...). */
function SeloPrazo({ prazo, agora }: { prazo: string | null; agora: Date }) {
  const situacao = situacaoPrazo(prazo, agora);
  const texto = textoPrazo(prazo, agora);
  const rotulo =
    situacao === "no_prazo"
      ? `Prazo: ${texto.charAt(0).toLocaleLowerCase("pt-BR")}${texto.slice(1)}`
      : texto;
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${COR_PRAZO[situacao]}`}
    >
      {rotulo}
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
  const cor = COR_STATUS[coluna];
  return (
    <article
      aria-label={`Chamado ${c.id}: ${c.titulo}`}
      className={`flex flex-col gap-1 rounded-xl border border-l-[6px] border-borda px-3 py-2.5 shadow-sm ${cor.faixa} ${cor.fundo}`}
    >
      <EtiquetaId numero={c.id} tom={TOM_ID} />
      <Link
        href={`/atendimento/${c.id}`}
        className="text-sm leading-snug font-bold hover:underline"
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
 * Cartão do quadro (pedidos do dono, 2026-10-07): a COR é a do STATUS (faixa grossa + fundo branco, muda
 * junto com o status); em cima só ID, prioridade alta, NOVO e transferido; o sistema fica no rodapé; etiqueta "ID" verde-água; o PRAZO num retângulo próprio (vencido vermelho, sem prazo
 * amarelo); título em destaque; "Iniciar" pequeno. Em atendimento → com quem está; Aguardando → há quanto
 * tempo o solicitante não responde.
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

  const cor = COR_STATUS[coluna];
  // Sistema no rodapé, ao lado do prazo; "Não se aplica" não aparece no cartão (só dentro do chamado).
  const sistema = dados.sistema?.nome === SEM_SISTEMA ? null : dados.sistema;
  const corSistema = classesDaCor(sistema?.cor);
  const transferidoParaMim = c.status === "transferido" && c.responsavelId === euId;
  const podeIniciar = c.status === "pendente" || transferidoParaMim;
  const comQuem = responsavel?.id === euId ? "você" : primeiroNome(responsavel);

  return (
    <article
      ref={arraste?.ref}
      {...arraste?.atributos}
      {...arraste?.ouvintes}
      aria-label={`Chamado ${c.id}: ${c.titulo}`}
      className={`flex cursor-grab touch-manipulation flex-col gap-1.5 rounded-2xl border border-l-[6px] p-3 shadow-sm transition-shadow select-none hover:shadow-md focus-visible:outline-2 focus-visible:outline-primaria active:cursor-grabbing ${cor.faixa} ${cor.fundo} ${
        destacado ? "border-primaria ring-2 ring-primaria" : "border-borda"
      } ${arraste?.arrastando ? "opacity-40" : ""} ${fantasma ? "rotate-1 cursor-grabbing shadow-xl" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <EtiquetaId numero={c.id} tom={TOM_ID} />
        {c.prioridade === "alta" ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-perigo px-1.5 py-0.5 text-[11px] font-bold text-white">
            <TriangleAlert aria-hidden="true" className="size-3" /> Prioridade alta
          </span>
        ) : null}
        {coluna === "novos" && ehNovo(c, agora) ? (
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

      <Link
        href={`/atendimento/${c.id}`}
        className="text-[15px] leading-snug font-bold hover:underline"
        draggable={false}
      >
        {c.titulo}
      </Link>
      {/* Nome · categoria inteiros (sem "…"): letra um pouco menor e quebra de linha se precisar. */}
      <p className="text-[13px] leading-snug text-texto">
        <span className="font-medium">{solicitante?.nome ?? "—"}</span>
        <span className="text-texto-suave"> · {assunto}</span>
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
        </p>
      ) : null}
      {coluna === "aguardando" ? (
        <p className="flex items-center gap-1.5 text-sm text-royal">
          <Hourglass aria-hidden="true" className="size-4 shrink-0" />
          <span className="min-w-0 leading-snug">
            Esperando <strong>{primeiroNome(solicitante) || "o solicitante"}</strong>{" "}
            {tempoRelativo(c.atualizadoEm, agora)}
          </span>
        </p>
      ) : null}
      {coluna === "transferidos" && !transferidoParaMim ? (
        <p className="text-sm text-texto-suave">
          Aguardando <strong className="text-texto">{primeiroNome(responsavel)}</strong> iniciar
        </p>
      ) : null}

      <div className="mt-0.5 flex flex-wrap items-center gap-2">
        <SeloPrazo prazo={c.prazoSla} agora={agora} />
        {sistema ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-texto">
            {corSistema ? (
              <span aria-hidden="true" className={`size-2.5 rounded-sm ${corSistema.fundo}`} />
            ) : null}
            {sistema.nome}
          </span>
        ) : null}
        <NaoLidas total={naoLidas} />
        {(coluna === "novos" || coluna === "transferidos") && podeIniciar ? (
          <button
            type="button"
            onClick={() => aoAssumir(c.id)}
            className="ml-auto inline-flex h-8 items-center rounded-lg bg-barra px-3 text-xs font-bold text-sobre-barra hover:bg-barra-2"
          >
            Iniciar
          </button>
        ) : null}
      </div>
    </article>
  );
}
