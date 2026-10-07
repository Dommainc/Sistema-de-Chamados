"use client";

import { Hourglass, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { BarraPrazo } from "@/components/ui/BarraPrazo";
import { Botao } from "@/components/ui/Botao";
import { NumeroTicket } from "@/components/ui/NumeroTicket";
import type { PerfilPublico } from "@/lib/dados/tipos";
import type { Chamado } from "@/lib/dominio/tipos";
import { formatarAtualizacao, formatarNumeroChamado, tempoRelativo } from "@/lib/formato";
import { situacaoPrazo } from "@/lib/prazo";
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
}

/** Tipo de dado arrastado entre colunas. */
export const TIPO_ARRASTE = "application/x-central-chamado";

const primeiroNome = (p: PerfilPublico | undefined) => p?.nome.split(" ")[0] ?? "";

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
      <Link
        href={`/atendimento/${c.id}`}
        className="text-sm leading-snug font-semibold hover:underline"
      >
        <span className="font-mono text-texto-suave">{formatarNumeroChamado(c.id)}</span>{" "}
        <span>{c.titulo}</span>
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
 * o que importa em cada coluna: Novos → Assumir; Em atendimento → com quem está;
 * Aguardando → há quanto tempo espera o solicitante (pedido do dono, 2026-10-07: cartões "confundíveis").
 */
export function CartaoChamado({
  dados,
  euId,
  agora,
  destacado,
  aoAssumir,
}: {
  dados: DadosCartao;
  euId: string;
  agora: Date;
  destacado: boolean;
  aoAssumir: (chamadoId: number) => void;
}) {
  const { chamado: c, coluna, solicitante, responsavel, assunto, naoLidas, transferidoPor } = dados;
  if (coluna === "concluidos" || coluna === "cancelados") {
    return <CartaoEncerrado dados={dados} agora={agora} />;
  }

  const situacao = situacaoPrazo(c.prazoSla, agora);
  const transferidoParaMim = c.status === "transferido" && c.responsavelId === euId;
  const podeAssumir = c.status === "pendente" || transferidoParaMim;
  const comQuem = responsavel?.id === euId ? "você" : primeiroNome(responsavel);

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(TIPO_ARRASTE, JSON.stringify({ id: c.id, coluna }));
        e.dataTransfer.effectAllowed = "move";
      }}
      aria-label={`Chamado ${c.id}: ${c.titulo}`}
      className={`flex cursor-grab overflow-hidden rounded-2xl border bg-superficie shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing ${
        destacado ? "border-primaria ring-2 ring-primaria" : "border-borda"
      }`}
    >
      <NumeroTicket numero={c.id} situacao={situacao} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3">
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

        <div className="mt-1 flex items-end gap-3">
          <BarraPrazo
            criadoEm={c.criadoEm}
            prazo={c.prazoSla}
            agora={agora}
            comRotulo
            acao={
              coluna === "novos" && podeAssumir ? (
                <Botao
                  variante="escuro"
                  className="min-h-10 shrink-0 px-3 text-sm"
                  onClick={() => aoAssumir(c.id)}
                >
                  Assumir
                </Botao>
              ) : coluna === "novos" && naoLidas > 0 ? (
                <NaoLidas total={naoLidas} />
              ) : null
            }
          />
        </div>
      </div>
    </article>
  );
}
