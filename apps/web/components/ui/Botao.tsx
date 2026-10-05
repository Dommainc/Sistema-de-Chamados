import type { ButtonHTMLAttributes } from "react";

type Variante = "primario" | "secundario" | "perigo" | "fantasma";

const ESTILOS: Record<Variante, string> = {
  primario: "bg-primaria text-sobre-primaria hover:bg-primaria-forte",
  secundario: "bg-superficie text-texto border border-borda hover:bg-fundo",
  perigo: "bg-perigo text-white hover:opacity-90",
  fantasma: "bg-transparent text-primaria hover:bg-primaria-suave",
};

export interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  carregando?: boolean;
  larguraTotal?: boolean;
}

/** Botão com alvo de toque de no mínimo 44px. */
export function Botao({
  variante = "primario",
  carregando = false,
  larguraTotal = false,
  className = "",
  disabled,
  children,
  type = "button",
  ...props
}: BotaoProps) {
  return (
    <button
      type={type}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-base font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${ESTILOS[variante]} ${larguraTotal ? "w-full" : ""} ${className}`}
      {...props}
    >
      {carregando ? "Aguarde..." : children}
    </button>
  );
}
