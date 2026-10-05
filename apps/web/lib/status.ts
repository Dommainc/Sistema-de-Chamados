// Rótulos de status por perfil (docs/ui-ux.md, "Status").
// O solicitante não vê detalhes internos: "transferido" aparece como "Em atendimento".

import type { Papel, StatusChamado } from "@/lib/dominio/tipos";

export type TomStatus = "neutro" | "info" | "alerta" | "sucesso" | "apagado" | "roxo";

export interface RotuloStatus {
  texto: string;
  tom: TomStatus;
  /** Pede atenção do usuário (ex.: "Aguardando sua resposta"). */
  destaque: boolean;
}

const ROTULOS: Record<Papel, Record<StatusChamado, RotuloStatus>> = {
  solicitante: {
    pendente: { texto: "Recebido", tom: "neutro", destaque: false },
    em_andamento: { texto: "Em atendimento", tom: "info", destaque: false },
    aguardando_usuario: { texto: "Aguardando sua resposta", tom: "alerta", destaque: true },
    transferido: { texto: "Em atendimento", tom: "info", destaque: false },
    concluido: { texto: "Concluído", tom: "sucesso", destaque: false },
    cancelado: { texto: "Cancelado", tom: "apagado", destaque: false },
  },
  ti: {
    pendente: { texto: "Novo", tom: "neutro", destaque: false },
    em_andamento: { texto: "Em atendimento", tom: "info", destaque: false },
    aguardando_usuario: { texto: "Aguardando usuário", tom: "alerta", destaque: false },
    transferido: { texto: "Transferido", tom: "roxo", destaque: false },
    concluido: { texto: "Concluído", tom: "sucesso", destaque: false },
    cancelado: { texto: "Cancelado", tom: "apagado", destaque: false },
  },
};

export function rotuloStatus(status: StatusChamado, papel: Papel): RotuloStatus {
  return ROTULOS[papel][status];
}

/** Passos da barra de progresso do solicitante (ADR 0005: 3 passos). */
export const PASSOS_PROGRESSO = ["Recebido", "Em atendimento", "Concluído"] as const;

/**
 * Índice do passo atual (0, 1 ou 2) e se o chamado foi cancelado.
 * Cancelado não avança na barra: a tela mostra o aviso de cancelamento.
 */
export function passoProgresso(status: StatusChamado): { atual: number; cancelado: boolean } {
  switch (status) {
    case "pendente":
      return { atual: 0, cancelado: false };
    case "em_andamento":
    case "aguardando_usuario":
    case "transferido":
      return { atual: 1, cancelado: false };
    case "concluido":
      return { atual: 2, cancelado: false };
    case "cancelado":
      return { atual: 0, cancelado: true };
  }
}
