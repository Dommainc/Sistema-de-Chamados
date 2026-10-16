"use client";

import { useDados } from "@/lib/dados/provedor";
import { BotaoTema } from "./BotaoTema";

/** Botão ☀/🌙 nas áreas com sessão: além do navegador, guarda a escolha no perfil (vale no próximo login). */
export function BotaoTemaPerfil({ naBarra = false }: { naBarra?: boolean }) {
  const fonte = useDados();
  return <BotaoTema naBarra={naBarra} aoMudar={(tema) => fonte.salvarTema(tema)} />;
}
