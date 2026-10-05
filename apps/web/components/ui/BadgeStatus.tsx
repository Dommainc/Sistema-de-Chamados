import type { Papel, StatusChamado } from "@/lib/dominio/tipos";
import { rotuloStatus, type TomStatus } from "@/lib/status";

export const TONS_STATUS: Record<TomStatus, string> = {
  neutro: "bg-superficie-2 text-texto",
  info: "bg-info-suave text-info",
  alerta: "bg-alerta-suave text-alerta",
  sucesso: "bg-sucesso-suave text-sucesso",
  apagado: "bg-apagado-suave text-apagado",
  roxo: "bg-roxo-suave text-roxo",
};

export function BadgeStatus({
  status,
  papel,
  tamanho = "normal",
}: {
  status: StatusChamado;
  papel: Papel;
  tamanho?: "normal" | "pequeno";
}) {
  const rotulo = rotuloStatus(status, papel);
  const medida = tamanho === "pequeno" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold whitespace-nowrap ${medida} ${TONS_STATUS[rotulo.tom]}`}
    >
      {rotulo.texto}
    </span>
  );
}
