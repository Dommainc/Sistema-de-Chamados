// Regras puras do quadro da área técnica (mockup, tela 6; adaptado ao ADR 0005).

import type { AcaoChamado } from "@/lib/dominio/estados";
import type { Chamado, StatusChamado } from "@/lib/dominio/tipos";
import { situacaoPrazo, type SituacaoPrazo } from "@/lib/prazo";
import type { FiltroResponsavel } from "./parametros";

export type ColunaQuadro = "novos" | "em_atendimento" | "aguardando";

export const COLUNAS: readonly { id: ColunaQuadro; titulo: string; apoio: string }[] = [
  { id: "novos", titulo: "Novos", apoio: "Arraste para assumir" },
  { id: "em_atendimento", titulo: "Em atendimento", apoio: "TI cuidando" },
  { id: "aguardando", titulo: "Aguardando usuário", apoio: "Bola com o solicitante" },
];

/** Encerrados não aparecem no quadro ("Ver encerrados" leva à lista). */
export function colunaDoStatus(status: StatusChamado): ColunaQuadro | null {
  switch (status) {
    case "pendente":
    case "transferido":
      return "novos";
    case "em_andamento":
      return "em_atendimento";
    case "aguardando_usuario":
      return "aguardando";
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
    if (filtros.prazo !== "todos" && situacaoPrazo(c.prazoSla, agora) !== filtros.prazo) {
      return false;
    }
    const termo = normalizar(filtros.busca.trim());
    if (termo && !normalizar(c.titulo).includes(termo)) return false;
    return true;
  });
}

export type Quadro = Record<ColunaQuadro, Chamado[]>;

/** Separa por coluna, prazo mais próximo primeiro. */
export function montarQuadro(chamados: readonly Chamado[]): Quadro {
  const quadro: Quadro = { novos: [], em_atendimento: [], aguardando: [] };
  for (const c of chamados) {
    const coluna = colunaDoStatus(c.status);
    if (coluna) quadro[coluna].push(c);
  }
  for (const lista of Object.values(quadro)) {
    lista.sort((a, b) => a.prazoSla.localeCompare(b.prazoSla));
  }
  return quadro;
}

/**
 * Ordem da coluna "Novos" (mockup): primeiro os vencidos, depois o que foi transferido para mim
 * (é direcionado a mim), depois o resto pelo prazo mais próximo.
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
  return [...chamados].sort(
    (a, b) => prioridade(a) - prioridade(b) || a.prazoSla.localeCompare(b.prazoSla),
  );
}

/** Quantos estão vencidos, vencendo em menos de 1 h e no prazo (barrinha do topo da coluna). */
export function proporcaoPrazos(
  chamados: readonly Chamado[],
  agora: Date = new Date(),
): Record<SituacaoPrazo, number> {
  const contagem: Record<SituacaoPrazo, number> = { vencido: 0, vence_em_breve: 0, no_prazo: 0 };
  for (const c of chamados) contagem[situacaoPrazo(c.prazoSla, agora)]++;
  return contagem;
}

/**
 * Arrastar um cartão entre colunas vira uma ação da máquina de estados.
 * Novos → Em atendimento = assumir; Em atendimento → Aguardando = aguardar usuário;
 * Aguardando → Em atendimento = retomar. Outros movimentos não valem (null).
 */
export function acaoDoArraste(
  de: ColunaQuadro,
  para: ColunaQuadro,
): Exclude<AcaoChamado, "resposta_solicitante"> | null {
  if (de === "novos" && para === "em_atendimento") return "assumir";
  if (de === "em_atendimento" && para === "aguardando") return "aguardar_usuario";
  if (de === "aguardando" && para === "em_atendimento") return "retomar";
  return null;
}

/** Selo "NOVO": aberto há menos de 15 minutos. */
export const MINUTOS_NOVO = 15;

export function ehNovo(chamado: Chamado, agora: Date = new Date()): boolean {
  return agora.getTime() - new Date(chamado.criadoEm).getTime() < MINUTOS_NOVO * 60_000;
}
