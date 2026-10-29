// Regras puras do quadro da área técnica (layout novo e ata de 26/10/2026; adaptado ao ADR 0005).
// Seis colunas da mesma largura: Novos · Transferidos · Em atendimento · Aguardando solicitante · Concluídos ·
// Cancelados. Concluídos e Cancelados: últimos 7 dias (os antigos ficam na busca, na Lista e no relatório).

import type { AcaoChamado } from "@/lib/dominio/estados";
import { CHAVE_SISTEMA } from "@/lib/sistemas";
import type { Chamado, PrioridadeDaTi, StatusChamado } from "@/lib/dominio/tipos";
import { compararPrazo, situacaoPrazo } from "@/lib/prazo";
import type { FiltroResponsavel } from "./parametros";

export type ColunaQuadro =
  "novos" | "transferidos" | "em_atendimento" | "aguardando" | "concluidos" | "cancelados";

/** "Concluídos" e "Cancelados" mostram só os dos últimos dias. */
export const DIAS_CONCLUIDOS = 7;

export interface DefinicaoColuna {
  id: ColunaQuadro;
  titulo: string;
  apoio: string;
  /** Coluna de encerrados: estreita, cartões de uma linha, só leitura. */
  encerrada: boolean;
}

export const COLUNAS: readonly DefinicaoColuna[] = [
  // Ordem da ata de 26/10/2026 (item 03): Transferidos de volta ao lado de Novos.
  { id: "novos", titulo: "Novos", apoio: "Triagem", encerrada: false },
  {
    id: "transferidos",
    titulo: "Transferidos",
    apoio: "O técnico de destino inicia",
    encerrada: false,
  },
  { id: "em_atendimento", titulo: "Em atendimento", apoio: "", encerrada: false },
  {
    id: "aguardando",
    titulo: "Aguardando solicitante",
    apoio: "Esperando resposta",
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

export interface FiltrosQuadro {
  /** "Responsável": um técnico, "sem_responsavel" ou "todos" (sem filtro). */
  responsavel: FiltroResponsavel;
  /** "Só os meus": só os chamados em que eu sou o responsável. */
  soMeus: boolean;
  categoriaId: number | null;
  /** "Sistema": só os chamados com esta resposta em "Qual sistema?" (null = sem filtro). */
  sistema: string | null;
  /** "Prioridade" (só vale para chamados já iniciados: nos Novos ela ainda não existe — ADR 0012). */
  prioridade: PrioridadeDaTi | null;
  /** Busca da barra: parte do título ou do nome do solicitante; vazio = sem busca. */
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
  /** Nome do solicitante (para a busca encontrar "Paula" além do título). */
  nomeDe: (perfilId: string) => string = () => "",
): Chamado[] {
  const termo = normalizar(filtros.busca.trim());
  return chamados.filter((c) => {
    if (filtros.soMeus && c.responsavelId !== euId) return false;
    if (filtros.responsavel === "sem_responsavel" && c.responsavelId !== null) return false;
    if (
      filtros.responsavel !== "todos" &&
      filtros.responsavel !== "sem_responsavel" &&
      c.responsavelId !== filtros.responsavel
    ) {
      return false;
    }
    if (filtros.categoriaId !== null && c.categoriaId !== filtros.categoriaId) return false;
    if (filtros.sistema !== null && c.respostasForm[CHAVE_SISTEMA] !== filtros.sistema)
      return false;
    if (filtros.prioridade !== null && c.prioridade !== filtros.prioridade) return false;
    if (
      termo &&
      !normalizar(c.titulo).includes(termo) &&
      !normalizar(nomeDe(c.solicitanteId)).includes(termo)
    ) {
      return false;
    }
    return true;
  });
}

/** Resumo do topo: "9 em aberto · 1 com prazo estourado · 2 aguardando solicitante". */
export function resumoQuadro(
  chamados: readonly Chamado[],
  agora: Date = new Date(),
): { abertos: number; atrasados: number; aguardando: number } {
  const abertos = chamados.filter((c) => c.status !== "concluido" && c.status !== "cancelado");
  return {
    abertos: abertos.length,
    // Aguardando: o prazo fica pausado (não conta como atraso da TI).
    atrasados: abertos.filter(
      (c) => c.status !== "aguardando_usuario" && situacaoPrazo(c.prazoSla, agora) === "vencido",
    ).length,
    aguardando: abertos.filter((c) => c.status === "aguardando_usuario").length,
  };
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
 * (Aguardando usuário é só automático — ADR 0014: arrastar para lá, de lá para Em atendimento ou para
 * Novos não vale.)
 * Em atendimento/Aguardando → Transferidos = transferir (pede técnico e motivo);
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
