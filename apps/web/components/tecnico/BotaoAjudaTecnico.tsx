"use client";

import { usePathname } from "next/navigation";
import { BotaoAjuda } from "@/components/comum/BotaoAjuda";

/** "?" da área da TI: em "Abrir chamado" leva ao passo a passo de abrir; no resto, ao Guia da TI. */
export function BotaoAjudaTecnico() {
  const abrindo = usePathname().startsWith("/atendimento/novo");
  return <BotaoAjuda href={abrindo ? "/atendimento/ajuda/abrir" : "/atendimento/ajuda"} />;
}
