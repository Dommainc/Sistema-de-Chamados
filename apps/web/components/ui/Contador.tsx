import { numeroBr } from "@/lib/dominio/limites";

/**
 * "1.850 / 2.000" embaixo do campo, só quando o texto chega perto do limite (80%), para não poluir a tela.
 * Ao chegar no limite, fica em destaque.
 */
export function Contador({ valor, maximo }: { valor: unknown; maximo: number | undefined }) {
  if (!maximo) return null;
  const tamanho = typeof valor === "string" ? valor.length : 0;
  if (tamanho < maximo * 0.8) return null;
  const noLimite = tamanho >= maximo;
  return (
    <p
      aria-live="polite"
      className={`self-end text-xs ${noLimite ? "font-semibold text-perigo" : "text-texto-suave"}`}
    >
      {numeroBr(tamanho)} / {numeroBr(maximo)}
      {noLimite ? " · limite atingido" : ""}
    </p>
  );
}
