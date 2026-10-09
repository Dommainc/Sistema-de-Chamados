"use client";

import { Star } from "lucide-react";
import { useId, useState } from "react";

/** Nome de cada nota, mostrado ao escolher (pesquisa de satisfação — ADR 0015). */
export const NOMES_NOTA: Record<number, string> = {
  1: "Péssimo",
  2: "Ruim",
  3: "Regular",
  4: "Bom",
  5: "Ótimo",
};

const TAMANHOS = { pequeno: "size-4", medio: "size-5", grande: "size-9" } as const;

/** Estrelas só para ver (ex.: "★★★★☆"). */
export function Estrelas({
  nota,
  tamanho = "pequeno",
}: {
  nota: number;
  tamanho?: keyof typeof TAMANHOS;
}) {
  return (
    <span
      role="img"
      aria-label={`${nota} de 5 estrelas`}
      className="inline-flex shrink-0 items-center gap-0.5"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={`${TAMANHOS[tamanho]} ${n <= nota ? "fill-amarelo text-amarelo" : "text-borda"}`}
        />
      ))}
    </span>
  );
}

/**
 * Escolher de 1 a 5 estrelas. Por baixo são botões de rádio (teclado com as setas e leitores de tela);
 * passar o mouse acende as estrelas até aquela.
 */
export function EscolherEstrelas({
  valor,
  aoMudar,
  rotulo,
}: {
  valor: number | null;
  aoMudar: (nota: number) => void;
  rotulo: string;
}) {
  const nome = useId();
  const [sobre, setSobre] = useState<number | null>(null);
  const aceso = sobre ?? valor ?? 0;
  return (
    <fieldset className="flex flex-col items-center gap-1">
      <legend className="sr-only">{rotulo}</legend>
      <div className="flex gap-1" onMouseLeave={() => setSobre(null)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            onMouseEnter={() => setSobre(n)}
            className="cursor-pointer rounded-lg p-1 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primaria"
          >
            <input
              type="radio"
              name={nome}
              value={n}
              checked={valor === n}
              onChange={() => aoMudar(n)}
              className="sr-only"
              aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"} — ${NOMES_NOTA[n]}`}
            />
            <Star
              aria-hidden="true"
              className={`size-9 transition-colors ${n <= aceso ? "fill-amarelo text-amarelo" : "text-borda"}`}
            />
          </label>
        ))}
      </div>
      <p className="min-h-5 text-sm font-semibold text-texto-suave" aria-live="polite">
        {aceso ? NOMES_NOTA[aceso] : ""}
      </p>
    </fieldset>
  );
}
