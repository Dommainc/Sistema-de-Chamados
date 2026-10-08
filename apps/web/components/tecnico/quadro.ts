// Regras puras do quadro da área técnica (mockup, tela 6; adaptado ao ADR 0005).
// Seis colunas: Novos · Transferidos · Em atendimento · Aguardando usuário · Concluídos · Cancelados
// (pedidos do dono, 2026-10-06 e 2026-10-07). As duas últimas são estreitas e só mostram os últimos 7 dias.

import type { AcaoChamado } from "@/lib/dominio/estados";
import { CHAVE_SISTEMA } from "@/lib/sistemas";
import type { Chamado, StatusChamado } from "@/lib/dominio/tipos";
import { compararPrazo, situacaoPrazo, type SituacaoPrazo } from "@/lib/prazo";
import type { FiltroResponsavel } from "./parametros";

export type ColunaQuadro =
  "novos" | "transferidos" | "em_atendimento" | "aguardando" | "concluidos" | "cancelados";

/** "Concluídos" e "Cancelados" mostram só os dos últimos dias (os demais ficam em "Ver encerrados"). */
export const DIAS_CONCLUIDOS = 7;

export interface DefinicaoColuna {
  id: ColunaQuadro;
  titulo: string;
  apoio: string;
  /** Coluna de encerrados: estreita, cartões de uma linha, só leitura. */
  encerrada: boolean;
}

export const COLUNAS: readonly DefinicaoColuna[] = [
  { id: "novos", titulo: "Novos", apoio: "Arraste para iniciar", encerrada: false },
  {
    id: "transferidos",
    titulo: "Transferidos",
    apoio: "O técnico de destino inicia",
    encerrada: false,
  },
  { id: "em_atendimento", titulo: "Em atendimento", apoio: "TI cuidando", encerrada: false },
  {
    id: "aguardando",
    titulo: "Aguardando usuário",
    apoio: "Bola com o solicitante",
    encerrada: false,
  },
  {
    id: "concluidos",
    titulo: "Concluídos",
    apoio: `Últimos ${DIAS_CONCLUIDOS} dias`,
    encerrada: true,
  },
  {
    id: "cancelados",
    titulo: "Cancelados",
    apoio: `Últimos ${DIAS_CONCLUIDOS} dias`,
    encerrada: true,
  },
];

export function colunaDoStatus(status: StatusChamado): ColunaQuadro | null {
  switch (status) {
    case "pendente":
      return "novos";
    case "transferido":
      return "transferidos";
    case "em_andamento":
      return "em_atendimento";
    case "aguardando_usuario":
      return "aguardando";
    case "concluido":
      return "concluidos";
    case "cancelado":
      return "cancelados";
  }
}

export type FiltroPrazo = "todos" | SituacaoPrazo;

export interface FiltrosQuadro {
  responsavel: FiltroResponsavel;
  categoriaId: number | null;
  /** Filtro "Sistema": só os chamados com esta resposta em "Qual sistema?" (null = qualquer). */
  sistema: string | null;
  prazo: FiltroPrazo;
  /** Filtro "Status": só esta coluna (null = todas). */
  coluna: ColunaQuadro | null;
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
    if (
      !["todos", "meus", "sem_responsavel"].includes(filtros.responsavel) &&
      c.responsavelId !== filtros.responsavel
    ) {
      return false;
    }
    if (filtros.coluna !== null && colunaDoStatus(c.status) !== filtros.coluna) return false;
    if (filtros.categoriaId !== null && c.categoriaId !== filtros.categoriaId) return false;
    if (filtros.sistema !== null && c.respostasForm[CHAVE_SISTEMA] !== filtros.sistema)
      return false;
    // Prazo não se aplica a encerrados.
    if (
      filtros.prazo !== "todos" &&
      c.status !== "concluido" &&
      c.status !== "cancelado" &&
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
 * Concluídos e Cancelados: só os dos últimos DIAS_CONCLUIDOS dias, mais recentes primeiro.
 */
export function montarQuadro(chamados: readonly Chamado[], agora: Date = new Date()): Quadro {
  const quadro: Quadro = {
    novos: [],
    transferidos: [],
    em_atendimento: [],
    aguardando: [],
    concluidos: [],
    cancelados: [],
  };
  const limite = agora.getTime() - DIAS_CONCLUIDOS * 86_400_000;
  for (const c of chamados) {
    const coluna = colunaDoStatus(c.status);
    if (!coluna) continue;
    if (coluna === "concluidos" || coluna === "cancelados") {
      if (new Date(encerradoEm(c)).getTime() < limite) continue;
    }
    quadro[coluna].push(c);
  }
  for (const coluna of ["novos", "transferidos", "em_atendimento", "aguardando"] as const) {
    quadro[coluna].sort((a, b) => pesoPrioridade(a) - pesoPrioridade(b) || compararPrazo(a, b));
  }
  for (const coluna of ["concluidos", "cancelados"] as const) {
    quadro[coluna].sort((a, b) => encerradoEm(b).localeCompare(encerradoEm(a)));
  }
  return quadro;
}

/** Quando o chamado foi concluído ou cancelado. */
export function encerradoEm(c: Chamado): string {
  return c.concluidoEm ?? c.canceladoEm ?? c.atualizadoEm;
}

/** Prioridade alta sobe para o topo da coluna (pedido do dono, ADR 0012). */
export function pesoPrioridade(c: Chamado): number {
  return c.prioridade === "alta" || c.prioridade === "critica" ? 0 : 1;
}

/** Ordem da coluna "Novos": prioridade alta, depois os vencidos, depois o resto (compararPrazo). */
export function ordenarNovos(chamados: readonly Chamado[], agora: Date = new Date()): Chamado[] {
  const vencido = (c: Chamado) => (situacaoPrazo(c.prazoSla, agora) === "vencido" ? 0 : 1);
  return [...chamados].sort(
    (a, b) =>
      pesoPrioridade(a) - pesoPrioridade(b) || vencido(a) - vencido(b) || compararPrazo(a, b),
  );
}

/** Ordem da coluna "Transferidos": primeiro os transferidos PARA MIM (eu preciso iniciar). */
export function ordenarTransferidos(chamados: readonly Chamado[], euId: string): Chamado[] {
  const paraMim = (c: Chamado) => (c.responsavelId === euId ? 0 : 1);
  return [...chamados].sort(
    (a, b) =>
      paraMim(a) - paraMim(b) || pesoPrioridade(a) - pesoPrioridade(b) || compararPrazo(a, b),
  );
}

/**
 * Arrastar um cartão entre colunas vira uma ação da máquina de estados (a regra final é dela):
 * Novos/Transferidos → Em atendimento = iniciar (Transferidos: só o técnico de destino);
 * Em atendimento ↔ Aguardando = aguardar usuário / retomar;
 * Em atendimento/Aguardando → Transferidos = transferir (pede técnico e motivo);
 * Em atendimento/Aguardando/Transferidos → Novos = devolver à fila (pede motivo);
 * Em atendimento/Aguardando → Concluídos = concluir (confirma); qualquer aberta → Cancelados = cancelar (motivo).
 * Outros movimentos não valem (null).
 */
export function acaoDoArraste(
  de: ColunaQuadro,
  para: ColunaQuadro,
): Exclude<AcaoChamado, "resposta_solicitante"> | null {
  const emTrabalho = de === "em_atendimento" || de === "aguardando";
  if ((de === "novos" || de === "transferidos") && para === "em_atendimento") return "assumir";
  if (emTrabalho && para === "transferidos") return "transferir";
  if ((emTrabalho || de === "transferidos") && para === "novos") return "devolver_fila";
  if (de === "em_atendimento" && para === "aguardando") return "aguardar_usuario";
  if (de === "aguardando" && para === "em_atendimento") return "retomar";
  if ((de === "em_atendimento" || de === "aguardando") && para === "concluidos") return "concluir";
  if (!["concluidos", "cancelados"].includes(de) && para === "cancelados") {
    return "cancelar";
  }
  return null;
}

/** Selo "NOVO": nas primeiras 24 horas depois de aberto (pedido do dono, 2026-10-07). */
export const MINUTOS_NOVO = 24 * 60;

export function ehNovo(chamado: Chamado, agora: Date = new Date()): boolean {
  return agora.getTime() - new Date(chamado.criadoEm).getTime() < MINUTOS_NOVO * 60_000;
}
