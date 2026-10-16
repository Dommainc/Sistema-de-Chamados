"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { aplicarTema, type Tema } from "@/lib/tema";

/** Observa o `data-tema` do <html> (o servidor já manda certo; o botão só troca). */
function assinar(avisar: () => void): () => void {
  const observador = new MutationObserver(avisar);
  observador.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-tema"],
  });
  return () => observador.disconnect();
}
const temaAtual = (): Tema =>
  document.documentElement.dataset.tema === "escuro" ? "escuro" : "claro";
const temaNoServidor = (): Tema => "claro";

/**
 * Botão ☀/🌙: troca entre tela clara e escura. Na barra da TI usa as cores da barra; no portal e no login, as da
 * página. `aoMudar` grava no perfil (com sessão); se falhar, a troca continua valendo neste navegador.
 */
export function BotaoTema({
  naBarra = false,
  aoMudar,
}: {
  naBarra?: boolean;
  aoMudar?: (tema: Tema) => Promise<unknown>;
}) {
  const tema = useSyncExternalStore(assinar, temaAtual, temaNoServidor);
  const proximo: Tema = tema === "escuro" ? "claro" : "escuro";
  const rotulo = proximo === "escuro" ? "Usar tela escura" : "Usar tela clara";
  const Icone = tema === "escuro" ? Sun : Moon;

  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      onClick={() => {
        aplicarTema(proximo);
        aoMudar?.(proximo).catch(() => undefined);
      }}
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full ${
        naBarra
          ? "text-sobre-barra hover:bg-barra-2"
          : "text-texto-suave hover:bg-superficie-2 hover:text-texto"
      }`}
    >
      <Icone aria-hidden="true" className="size-5" />
    </button>
  );
}
