// Rótulos de status por perfil (docs/fases/1A-3-experiencia-por-perfil.md, item 8).
// O solicitante não vê detalhes internos: "transferido" aparece como "Em andamento".

import type { Papel, StatusChamado } from "@/lib/dominio/tipos";

export type TomStatus = "neutro" | "info" | "alerta" | "sucesso" | "apagado";

export interface RotuloStatus {
  texto: string;
  tom: TomStatus;
  /** Pede atenção do usuário (ex.: "Aguardando sua resposta"). */
  destaque: boolean;
}

const ROTULOS: Record<Papel, Record<StatusChamado, RotuloStatus>> = {
  solicitante: {
    pendente: { texto: "Pendente", tom: "neutro", destaque: false },
    em_andamento: { texto: "Em andamento", tom: "info", destaque: false },
    aguardando_usuario: { texto: "Aguardando sua resposta", tom: "alerta", destaque: true },
    transferido: { texto: "Em andamento", tom: "info", destaque: false },
    concluido: { texto: "Concluído", tom: "sucesso", destaque: false },
    cancelado: { texto: "Cancelado", tom: "apagado", destaque: false },
  },
  ti: {
    pendente: { texto: "Pendente", tom: "neutro", destaque: false },
    em_andamento: { texto: "Em andamento", tom: "info", destaque: false },
    aguardando_usuario: { texto: "Aguardando usuário", tom: "alerta", destaque: false },
    transferido: { texto: "Transferido", tom: "info", destaque: false },
    concluido: { texto: "Concluído", tom: "sucesso", destaque: false },
    cancelado: { texto: "Cancelado", tom: "apagado", destaque: false },
  },
};

export function rotuloStatus(status: StatusChamado, papel: Papel): RotuloStatus {
  return ROTULOS[papel][status];
}
