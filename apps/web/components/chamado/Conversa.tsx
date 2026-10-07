"use client";

// Conversa no estilo dos apps de mensagem (pedido do dono, 2026-10-06): hora dentro do balão,
// mensagens seguidas da mesma pessoa agrupadas, "pontinha" e nome só no primeiro balão do grupo,
// anexos dentro do balão. Cores do mockup: as minhas em azul à direita, as dos outros em branco.
// Notas internas não aparecem aqui: ficam no Relato técnico (components/tecnico/atendimento/RelatoTecnico).

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
} as const;

/** Balão de mensagem. `inicioDeGrupo` = primeiro da sequência: ganha a pontinha e o nome. */
export function Balao({
  conteudo,
  minha,
  sistema = false,
  autor = null,
  hora,
  inicioDeGrupo = true,
  anexos = [],
  esmaecido = false,
}: {
  conteudo: string;
  minha: boolean;
  /** Aviso automático da Central (sem autor). */
  sistema?: boolean;
  autor?: string | null;
  /** Texto do canto do balão: "09:52" ou "Enviando...". */
  hora: string;
  inicioDeGrupo?: boolean;
  anexos?: Anexo[];
  esmaecido?: boolean;
}) {
  const cor = sistema ? CORES.sistema : minha ? CORES.minha : CORES.outra;
  const lado = minha ? "self-end" : "self-start";
  const canto = inicioDeGrupo ? (minha ? "rounded-tr-sm" : "rounded-tl-sm") : "";

  return (
    <div
      className={`relative flex max-w-[min(85%,36rem)] flex-col gap-1 rounded-2xl px-3 pt-1.5 pb-1 shadow-sm ${cor.balao} ${lado} ${canto} ${esmaecido ? "opacity-70" : ""}`}
    >
      {inicioDeGrupo ? (
        <span
          aria-hidden="true"
          className={`absolute top-0 size-3 ${cor.ponta} ${
            minha
              ? "-right-2 [clip-path:polygon(0_0,100%_0,0_100%)]"
              : "-left-2 [clip-path:polygon(0_0,100%_0,100%_100%)]"
          }`}
        />
      ) : null}

      {autor && inicioDeGrupo ? (
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
        <span className={`shrink-0 text-[11px] leading-5 ${cor.hora}`}>{hora}</span>
      </div>
    </div>
  );
}

/** Evento do sistema ("Rafael iniciou o atendimento"): texto pequeno e discreto, sem disputar com as mensagens. */
function Evento({ texto, hora }: { texto: string; hora: string }) {
  return (
    <p className="mx-auto max-w-[90%] text-center text-xs text-texto-suave">
      {texto} <span className="whitespace-nowrap opacity-70">· {hora}</span>
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
              <Evento texto={item.texto} hora={item.hora} />
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
              autor={item.autor}
              hora={item.hora}
              inicioDeGrupo={item.inicioDeGrupo}
              anexos={item.anexos}
            />
          </li>
        );
      })}
    </ol>
  );
}
