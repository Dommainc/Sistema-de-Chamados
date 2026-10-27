// Cores do quadro no visual neutro (layout novo e ata de 26/10/2026): cartão branco, sem cor por status nem
// por sistema. A cor fica só na PRIORIDADE (Alta · Média · Baixa). Classes escritas por inteiro (Tailwind).

import type { Prioridade } from "@/lib/dominio/tipos";

export const COR_PRIORIDADE: Partial<Record<Prioridade, { classe: string; rotulo: string }>> = {
  alta: { classe: "bg-perigo text-white", rotulo: "Alta" },
  media: { classe: "bg-alerta text-white", rotulo: "Média" },
  baixa: { classe: "bg-apagado text-white", rotulo: "Baixa" },
};
