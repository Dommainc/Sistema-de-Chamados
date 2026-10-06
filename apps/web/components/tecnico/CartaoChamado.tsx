"use client";

import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { BarraPrazo } from "@/components/ui/BarraPrazo";
import { Botao } from "@/components/ui/Botao";
import { NumeroTicket } from "@/components/ui/NumeroTicket";
import type { PerfilPublico } from "@/lib/dados/tipos";
import type { Chamado } from "@/lib/dominio/tipos";
import { situacaoPrazo } from "@/lib/prazo";
import { ehNovo, type ColunaQuadro } from "./quadro";

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

/** Cartão do quadro (mockup, tela 6): canhoto "Nº" colorido pelo prazo, selos, prazo e ação. */
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
  const situacao = situacaoPrazo(c.prazoSla, agora);
  const transferidoParaMim = c.status === "transferido" && c.responsavelId === euId;
  const podeAssumir = c.status === "pendente" || transferidoParaMim;
  const primeiroNome = (p: PerfilPublico | undefined) => p?.nome.split(" ")[0] ?? "";

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
        <div className="mt-1 flex items-end gap-3">
          <BarraPrazo criadoEm={c.criadoEm} prazo={c.prazoSla} agora={agora} />
          {coluna === "novos" && podeAssumir ? (
            <Botao
              variante="escuro"
              className="min-h-10 shrink-0 px-3 text-sm"
              onClick={() => aoAssumir(c.id)}
            >
              Assumir
            </Botao>
          ) : (
            <span className="flex shrink-0 items-center gap-1.5">
              {naoLidas > 0 ? (
                <span
                  title={`${naoLidas} mensagem(ns) nova(s)`}
                  className="flex items-center gap-1 rounded-md bg-primaria-suave px-1.5 py-0.5 text-xs font-semibold text-primaria"
                >
                  <MessageSquare aria-hidden="true" className="size-3.5" />
                  {naoLidas}
                </span>
              ) : null}
              {responsavel ? (
                <Avatar
                  nome={responsavel.nome}
                  tamanho="pequeno"
                  tom={responsavel.id === euId ? "escuro" : "suave"}
                />
              ) : null}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
