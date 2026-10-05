import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Abrir chamado" };

/** A TI também abre chamado (ADR 0005). O formulário é o mesmo do portal e chega na Entrega 2. */
export default function PaginaNovoChamadoTecnico() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Abrir chamado</h1>
      <Card className="text-texto-suave">
        O formulário de abertura (o mesmo do portal do solicitante) chega na Entrega 2.
      </Card>
    </div>
  );
}
