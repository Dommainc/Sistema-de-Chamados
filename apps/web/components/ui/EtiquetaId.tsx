/**
 * Etiqueta "ID 36" dos cartões (pedido do dono, 2026-10-07): pequena, horizontal, no canto superior
 * esquerdo. Substitui o canhoto "Nº" vertical. `tom` = classes de cor (a urgência do cartão).
 */
export function EtiquetaId({
  numero,
  tom = "bg-superficie-2 text-texto-suave",
}: {
  numero: number;
  tom?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 font-mono text-[11px] leading-4 font-bold tracking-wide ${tom}`}
    >
      ID {numero}
    </span>
  );
}
