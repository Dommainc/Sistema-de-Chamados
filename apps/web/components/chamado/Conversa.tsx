"use client";

// Conversa no estilo dos apps de mensagem (pedido do dono, 2026-10-06): hora dentro do balão,
// mensagens seguidas da mesma pessoa agrupadas, "pontinha" e nome só no primeiro balão do grupo,
// anexos dentro do balão. As minhas à direita (cor primária), as dos outros em branco.
// Layout novo (parte 3): na tela da TI, as notas internas entram aqui também, em âmbar e com o rótulo
// "Nota interna"; os eventos só da TI levam um cadeado.

import { Check, CheckCheck, Lock } from "lucide-react";
import type { Anexo } from "@/lib/dominio/tipos";
import { AnexoMiniatura } from "./AnexoMiniatura";
import type { ItemConversa } from "./linhaDoTempo";

/** Pílula cinza centralizada: separador de dia e eventos do sistema (mockup, telas 5 e 7). */
export function Pilula({ children }: { children: React.ReactNode }) {
  return (
    <p className="mx-auto w-fit max-w-[90%] rounded-full bg-superficie-2 px-3 py-1 text-center text-xs text-texto-suave">
      {children}
    </p>
  );
}

const CORES = {
  minha: {
    balao: "bg-primaria text-sobre-primaria",
    ponta: "bg-primaria",
    hora: "text-sobre-primaria/75",
  },
  outra: { balao: "bg-superficie text-texto", ponta: "bg-superficie", hora: "text-texto-suave" },
  // Aviso automático da Central (ADR 0011): azul-claro, para não parecer mensagem de uma pessoa.
  sistema: { balao: "bg-info-suave text-texto", ponta: "bg-info-suave", hora: "text-texto-suave" },
  // Nota interna (só a TI): âmbar com borda tracejada, para nunca parecer resposta ao solicitante.
  interna: {
    balao: "border border-dashed border-alerta-borda bg-alerta-suave text-texto",
    ponta: "bg-alerta-suave",
    hora: "text-texto-suave",
  },
} as const;

/** Balão de mensagem. `inicioDeGrupo` = primeiro da sequência: ganha a pontinha e o nome. */
export function Balao({
  conteudo,
  minha,
  sistema = false,
  interna = false,
  autor = null,
  hora,
  inicioDeGrupo = true,
  anexos = [],
  esmaecido = false,
  visto = null,
}: {
  conteudo: string;
  minha: boolean;
  /** Aviso automático da Central (sem autor). */
  sistema?: boolean;
  /** Nota interna: só a TI vê. */
  interna?: boolean;
  autor?: string | null;
  /** Texto do canto do balão: "09:52" ou "Enviando...". */
  hora: string;
  inicioDeGrupo?: boolean;
  anexos?: Anexo[];
  esmaecido?: boolean;
  /** ✓ enviada · ✓✓ vista pelo solicitante (só a TI vê). Nulo = sem marca. */
  visto?: boolean | null;
}) {
  const cor = interna ? CORES.interna : sistema ? CORES.sistema : minha ? CORES.minha : CORES.outra;
  const lado = minha ? "self-end" : "self-start";
  // Nota interna: sem "pontinha" (a borda tracejada não combina com ela).
  const comPonta = inicioDeGrupo && !interna;
  const canto = comPonta ? (minha ? "rounded-tr-sm" : "rounded-tl-sm") : "";

  return (
    <div
      className={`relative flex max-w-[min(85%,36rem)] flex-col gap-1 rounded-2xl px-3 pt-1.5 pb-1 shadow-sm ${cor.balao} ${lado} ${canto} ${esmaecido ? "opacity-70" : ""}`}
    >
      {comPonta ? (
        <span
          aria-hidden="true"
          className={`absolute top-0 size-3 ${cor.ponta} ${
            minha
              ? "-right-2 [clip-path:polygon(0_0,100%_0,0_100%)]"
              : "-left-2 [clip-path:polygon(0_0,100%_0,100%_100%)]"
          }`}
        />
      ) : null}

      {interna ? (
        <span className="flex items-center gap-1 text-xs font-semibold text-alerta">
          <Lock aria-hidden="true" className="size-3.5" />
          Nota interna{autor ? ` · ${autor}` : ""}
          <span className="sr-only"> (só a TI vê)</span>
        </span>
      ) : autor && inicioDeGrupo ? (
        <span className="text-xs font-semibold text-primaria">{autor}</span>
      ) : null}

      {anexos.length > 0 ? (
        <div className="-mx-1.5 flex flex-col gap-1 pt-0.5">
          {anexos.map((a) => (
            <AnexoMiniatura key={a.id} anexo={a} minha={minha} dentroDoBalao />
          ))}
        </div>
      ) : null}

      {/* Texto e hora: a hora fica no canto de baixo, e desce de linha se o texto ocupar tudo. */}
      <div className="flex flex-wrap items-end justify-end gap-x-3">
        {conteudo ? (
          <p className="mr-auto min-w-0 break-words whitespace-pre-line">{conteudo}</p>
        ) : null}
        <span
          className={`inline-flex shrink-0 items-center gap-1 text-[11px] leading-5 ${cor.hora}`}
        >
          {hora}
          {visto === null ? null : visto ? (
            <CheckCheck role="img" aria-label="Vista" className="size-4 text-sis-azul-claro">
              <title>Vista pelo solicitante</title>
            </CheckCheck>
          ) : (
            <Check role="img" aria-label="Enviada" className="size-4">
              <title>Enviada (ainda não vista)</title>
            </Check>
          )}
        </span>
      </div>
    </div>
  );
}

/**
 * Evento do sistema ("Rafael iniciou o atendimento"): linha fina com o texto no meio (layout novo), pequeno e
 * discreto. Só da TI (motivo da transferência, prioridade): com cadeado.
 */
function Evento({ texto, hora, interno }: { texto: string; hora: string; interno: boolean }) {
  return (
    <p className="flex items-center gap-3 text-xs text-texto-suave">
      <span aria-hidden="true" className="h-px min-w-4 flex-1 bg-borda" />
      <span className="max-w-[85%] text-center">
        {interno ? (
          <Lock aria-hidden="true" className="mr-1 mb-0.5 inline size-3 text-alerta" />
        ) : null}
        {texto} <span className="whitespace-nowrap opacity-70">· {hora}</span>
        {interno ? <span className="sr-only"> (só a TI vê)</span> : null}
      </span>
      <span aria-hidden="true" className="h-px min-w-4 flex-1 bg-borda" />
    </p>
  );
}

export function Conversa({ itens }: { itens: ItemConversa[] }) {
  return (
    <ol className="flex flex-col" aria-label="Conversa do chamado">
      {itens.map((item) => {
        if (item.tipo === "dia") {
          return (
            <li key={item.chave} className="my-3">
              <Pilula>{item.texto}</Pilula>
            </li>
          );
        }
        if (item.tipo === "evento") {
          return (
            <li key={item.chave} className="my-2">
              <Evento texto={item.texto} hora={item.hora} interno={item.interno} />
            </li>
          );
        }
        return (
          // Mais espaço entre pessoas diferentes; balões do mesmo grupo quase colados.
          <li
            key={item.chave}
            className={`flex flex-col ${item.inicioDeGrupo ? "mt-3" : "mt-0.5"}`}
          >
            <Balao
              conteudo={item.conteudo}
              minha={item.minha}
              sistema={item.sistema}
              interna={item.interna}
              autor={item.autor}
              hora={item.hora}
              inicioDeGrupo={item.inicioDeGrupo}
              anexos={item.anexos}
              visto={item.visto}
            />
          </li>
        );
      })}
    </ol>
  );
}
