"use client";

import { Lock } from "lucide-react";
import { AnexoMiniatura } from "./AnexoMiniatura";
import type { ItemConversa } from "./linhaDoTempo";

/** Pílula cinza centralizada: separador de dia e eventos do sistema (mockup, telas 5 e 7). */
export function Pilula({ children }: { children: React.ReactNode }) {
  return (
    <p className="mx-auto w-fit rounded-full bg-superficie-2 px-3 py-1 text-center text-xs text-texto-suave">
      {children}
    </p>
  );
}

/** Balão de mensagem: meu à direita (azul), dos outros à esquerda (branco), nota interna em âmbar. */
export function Balao({
  conteudo,
  minha,
  interna,
  children,
  esmaecido = false,
}: {
  conteudo: string;
  minha: boolean;
  interna: boolean;
  children?: React.ReactNode;
  esmaecido?: boolean;
}) {
  if (!conteudo) return <>{children}</>;
  const estilo = interna
    ? "border border-dashed border-alerta-borda bg-alerta-suave text-texto"
    : minha
      ? "bg-primaria text-sobre-primaria"
      : "border border-borda bg-superficie text-texto";
  return (
    <div
      className={`max-w-[min(85%,42rem)] rounded-2xl px-4 py-3 whitespace-pre-line ${estilo} ${minha ? "self-end rounded-br-md" : "self-start rounded-bl-md"} ${esmaecido ? "opacity-70" : ""}`}
    >
      {conteudo}
    </div>
  );
}

export function Conversa({ itens }: { itens: ItemConversa[] }) {
  return (
    <ol className="flex flex-col gap-3" aria-label="Conversa do chamado">
      {itens.map((item) => {
        if (item.tipo === "dia") {
          return (
            <li key={item.chave}>
              <Pilula>{item.texto}</Pilula>
            </li>
          );
        }
        if (item.tipo === "evento") {
          return (
            <li key={item.chave}>
              <Pilula>
                {item.texto} · {item.hora}
              </Pilula>
            </li>
          );
        }
        return (
          <li key={item.chave} className="flex flex-col gap-1.5">
            {item.interna ? (
              <p
                className={`flex items-center gap-1 text-xs font-semibold text-alerta ${item.minha ? "self-end" : "self-start"}`}
              >
                <Lock aria-hidden="true" className="size-3.5" /> Nota interna · só a TI vê
              </p>
            ) : null}
            <Balao conteudo={item.conteudo} minha={item.minha} interna={item.interna} />
            {item.anexos.map((a) => (
              <AnexoMiniatura key={a.id} anexo={a} minha={item.minha} />
            ))}
            <p className={`text-xs text-texto-suave ${item.minha ? "self-end" : "self-start"}`}>
              {item.rodape}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
