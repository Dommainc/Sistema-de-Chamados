// Regras puras do quadro da área técnica (mockup, tela 6; adaptado ao ADR 0005).
// Quatro colunas: Novos · Em atendimento · Aguardando usuário · Concluídos (pedido do dono, 2026-10-06).

import type { AcaoChamado } from "@/lib/dominio/estados";
import type { Chamado, StatusChamado } from "@/lib/dominio/tipos";
import { compararPrazo, situacaoPrazo, type SituacaoPrazo } from "@/lib/prazo";
import type { FiltroResponsavel } from "./parametros";

export type ColunaQuadro = "novos" | "em_atendimento" | "aguardando" | "concluidos";

/** "Concluídos" mostra só os dos últimos dias (os demais ficam em "Ver encerrados"). */
export const DIAS_CONCLUIDOS = 7;

export const COLUNAS: readonly { id: ColunaQuadro; titulo: string; apoio: string }[] = [
  { id: "novos", titulo: "Novos", apoio: "Arraste para assumir" },
  { id: "em_atendimento", titulo: "Em atendimento", apoio: "TI cuidando" },
  { id: "aguardando", titulo: "Aguardando usuário", apoio: "Bola com o solicitante" },
  { id: "concluidos", titulo: "Concluídos", apoio: `Últimos ${DIAS_CONCLUIDOS} dias` },
];

/** Cancelados não aparecem no quadro ("Ver encerrados"). */
export function colunaDoStatus(status: StatusChamado): ColunaQuadro | null {
  switch (status) {
    case "pendente":
    case "transferido":
      return "novos";
    case "em_andamento":
      return "em_atendimento";
    case "aguardando_usuario":
      return "aguardando";
    case "concluido":
      return "concluidos";
    default:
      return null;
  }
}

export type FiltroPrazo = "todos" | SituacaoPrazo;

export interface FiltrosQuadro {
  responsavel: FiltroResponsavel;
  categoriaId: number | null;
  prazo: FiltroPrazo;
  /** Texto da busca da barra (parte do título); vazio = sem busca. */
  busca: string;
}

/** Ignora acentos e maiúsculas: "impressao" encontra "Impressora". */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR");
}

export function filtrarChamados(
  chamados: readonly Chamado[],
  filtros: FiltrosQuadro,
  euId: string,
  agora: Date = new Date(),
): Chamado[] {
  return chamados.filter((c) => {
    if (filtros.responsavel === "meus" && c.responsavelId !== euId) return false;
    if (filtros.responsavel === "sem_responsavel" && c.responsavelId !== null) return false;
    if (filtros.categoriaId !== null && c.categoriaId !== filtros.categoriaId) return false;
    // Prazo não se aplica a concluídos.
    if (
      filtros.prazo !== "todos" &&
      c.status !== "concluido" &&
      situacaoPrazo(c.prazoSla, agora) !== filtros.prazo
    ) {
      return false;
    }
    const termo = normalizar(filtros.busca.trim());
    if (termo && !normalizar(c.titulo).includes(termo)) return false;
    return true;
  });
}

export type Quadro = Record<ColunaQuadro, Chamado[]>;

/**
 * Separa por coluna. Abertos: prazo mais próximo primeiro.
 * Concluídos: só os dos últimos DIAS_CONCLUIDOS dias, mais recentes primeiro.
 */
export function montarQuadro(chamados: readonly Chamado[], agora: Date = new Date()): Quadro {
  const quadro: Quadro = { novos: [], em_atendimento: [], aguardando: [], concluidos: [] };
  const limite = agora.getTime() - DIAS_CONCLUIDOS * 86_400_000;
  for (const c of chamados) {
    const coluna = colunaDoStatus(c.status);
    if (!coluna) continue;
    if (coluna === "concluidos" && new Date(c.concluidoEm ?? c.atualizadoEm).getTime() < limite) {
      continue;
    }
    quadro[coluna].push(c);
  }
  for (const coluna of ["novos", "em_atendimento", "aguardando"] as const) {
    quadro[coluna].sort(compararPrazo);
  }
  quadro.concluidos.sort((a, b) =>
    (b.concluidoEm ?? b.atualizadoEm).localeCompare(a.concluidoEm ?? a.atualizadoEm),
  );
  return quadro;
}

/**
 * Ordem da coluna "Novos" (mockup): primeiro os vencidos, depois o que foi transferido para mim
 * (é direcionado a mim), depois o resto (compararPrazo).
 */
export function ordenarNovos(
  chamados: readonly Chamado[],
  euId: string,
  agora: Date = new Date(),
): Chamado[] {
  const prioridade = (c: Chamado) => {
    if (situacaoPrazo(c.prazoSla, agora) === "vencido") return 0;
    if (c.status === "transferido" && c.responsavelId === euId) return 1;
    return 2;
  };
  return [...chamados].sort((a, b) => prioridade(a) - prioridade(b) || compararPrazo(a, b));
}

/** Quantos estão vencidos, vencendo em menos de 1 h, no prazo e sem prazo (barrinha do topo da coluna). */
export function proporcaoPrazos(
  chamados: readonly Chamado[],
  agora: Date = new Date(),
): Record<SituacaoPrazo, number> {
  const contagem: Record<SituacaoPrazo, number> = {
    vencido: 0,
    vence_em_breve: 0,
    no_prazo: 0,
    sem_prazo: 0,
  };
  for (const c of chamados) contagem[situacaoPrazo(c.prazoSla, agora)]++;
  return contagem;
}

/**
 * Arrastar um cartão entre colunas vira uma ação da máquina de estados.
 * Novos → Em atendimento = assumir; Em atendimento → Aguardando = aguardar usuário;
 * Aguardando → Em atendimento = retomar; Em atendimento/Aguardando → Concluídos = concluir
 * (com confirmação). Outros movimentos não valem (null).
 */
export function acaoDoArraste(
  de: ColunaQuadro,
  para: ColunaQuadro,
): Exclude<AcaoChamado, "resposta_solicitante"> | null {
  if (de === "novos" && para === "em_atendimento") return "assumir";
  if (de === "em_atendimento" && para === "aguardando") return "aguardar_usuario";
  if (de === "aguardando" && para === "em_atendimento") return "retomar";
  if ((de === "em_atendimento" || de === "aguardando") && para === "concluidos") return "concluir";
  return null;
}

/** Selo "NOVO": aberto há menos de 15 minutos. */
export const MINUTOS_NOVO = 15;

export function ehNovo(chamado: Chamado, agora: Date = new Date()): boolean {
  return agora.getTime() - new Date(chamado.criadoEm).getTime() < MINUTOS_NOVO * 60_000;
}
