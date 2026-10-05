import type { ButtonHTMLAttributes } from "react";

export type VarianteBotao = "primario" | "escuro" | "sucesso" | "contorno" | "perigo" | "fantasma";

/** Estilos dos botões do mockup (docs/ui-ux.md). Exportado para links com cara de botão. */
export const ESTILOS_BOTAO: Record<VarianteBotao, string> = {
  primario: "bg-primaria text-sobre-primaria hover:bg-primaria-forte",
  escuro: "bg-barra text-sobre-barra hover:bg-barra-2",
  sucesso: "bg-sucesso text-white hover:opacity-90",
  contorno: "border border-borda bg-superficie text-texto hover:bg-fundo",
  perigo: "bg-transparent text-perigo hover:bg-perigo-suave",
  fantasma: "bg-transparent text-primaria hover:bg-primaria-suave",
};

export const BASE_BOTAO =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

export interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBotao;
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
      className={`${BASE_BOTAO} ${ESTILOS_BOTAO[variante]} ${larguraTotal ? "w-full" : ""} ${className}`}
      {...props}
    >
      {carregando ? "Aguarde..." : children}
    </button>
  );
}
