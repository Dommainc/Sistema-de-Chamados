import type { Papel, StatusChamado } from "@/lib/dominio/tipos";
import { rotuloStatus, type TomStatus } from "@/lib/status";

const TONS: Record<TomStatus, string> = {
  neutro: "bg-primaria-suave text-primaria-forte",
  info: "bg-info-suave text-info",
  alerta: "bg-alerta-suave text-alerta",
  sucesso: "bg-sucesso-suave text-sucesso",
  apagado: "bg-apagado-suave text-apagado",
};

export function BadgeStatus({ status, papel }: { status: StatusChamado; papel: Papel }) {
  const rotulo = rotuloStatus(status, papel);
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${TONS[rotulo.tom]} ${rotulo.destaque ? "ring-2 ring-alerta" : ""}`}
    >
      {rotulo.texto}
    </span>
  );
}
