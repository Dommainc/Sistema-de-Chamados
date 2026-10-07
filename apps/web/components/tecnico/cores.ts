// Cores do quadro (pedido do dono, 2026-10-07): a COR DO CARTÃO é a do STATUS (muda junto com ele);
// o PRAZO só colore o retângulo do prazo. Classes fixas (o Tailwind precisa vê-las escritas por inteiro).

import type { SituacaoPrazo } from "@/lib/prazo";
import type { ColunaQuadro } from "./quadro";

export const COR_STATUS: Record<
  ColunaQuadro,
  { faixa: string; fundo: string; bolinha: string; rotulo: string }
> = {
  novos: {
    faixa: "border-l-laranja",
    fundo: "bg-laranja-cartao",
    bolinha: "bg-laranja",
    rotulo: "Novos",
  },
  transferidos: {
    faixa: "border-l-roxo",
    fundo: "bg-roxo-suave/60",
    bolinha: "bg-roxo",
    rotulo: "Transferidos",
  },
  em_atendimento: {
    faixa: "border-l-amarelo",
    fundo: "bg-amarelo-suave",
    bolinha: "bg-amarelo",
    rotulo: "Em atendimento",
  },
  aguardando: {
    faixa: "border-l-royal",
    fundo: "bg-royal-suave/60",
    bolinha: "bg-royal",
    rotulo: "Aguardando usuário",
  },
  concluidos: {
    faixa: "border-l-sucesso",
    fundo: "bg-sucesso-suave/60",
    bolinha: "bg-sucesso",
    rotulo: "Concluídos",
  },
  cancelados: {
    faixa: "border-l-apagado",
    fundo: "bg-apagado-suave/70",
    bolinha: "bg-apagado",
    rotulo: "Cancelados",
  },
};

/** Retângulo do prazo: vencido vermelho; vence em menos de 1 h laranja; sem prazo amarelo; em dia neutro. */
export const COR_PRAZO: Record<SituacaoPrazo, string> = {
  vencido: "bg-perigo text-white",
  vence_em_breve: "bg-laranja text-white",
  sem_prazo: "bg-alerta-suave text-alerta",
  no_prazo: "border border-borda bg-superficie text-texto",
};
