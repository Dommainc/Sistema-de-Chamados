import type { Metadata } from "next";
import { ChamadosEncerrados } from "@/components/tecnico/ChamadosEncerrados";

export const metadata: Metadata = { title: "Chamados encerrados" };

export default function PaginaEncerrados() {
  return <ChamadosEncerrados />;
}
