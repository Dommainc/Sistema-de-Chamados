import type { Metadata } from "next";
import { ListaMeusChamados } from "@/components/solicitante/ListaMeusChamados";

export const metadata: Metadata = { title: "Meus chamados" };

export default function PaginaMeusChamados() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Meus chamados</h1>
      <ListaMeusChamados />
    </div>
  );
}
