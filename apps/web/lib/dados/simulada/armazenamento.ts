// Estado da versão simulada, guardado no navegador (localStorage) e avisado entre abas
// (BroadcastChannel) para simular o tempo real. Sem navegador (servidor/testes), fica só em memória.
// Os arquivos anexados ficam à parte, no IndexedDB (./arquivos.ts).

import type {
  Anexo,
  Avaliacao,
  Chamado,
  EventoHistorico,
  Leitura,
  Mensagem,
  Notificacao,
  Perfil,
} from "@/lib/dominio/tipos";
import { apagarTodosOsArquivos } from "./arquivos";
import {
  gerarAntigosExemplo,
  gerarAvaliacoesExemplo,
  gerarChamadosExemplo,
  gerarConversasExemplo,
  gerarHistoricoExemplo,
} from "./exemplos";
import { OUTROS_PERFIS_EXEMPLO, USUARIOS_SIMULADOS } from "./usuarios";

// Mude a versão quando o formato ou os dados de exemplo mudarem: o navegador recomeça do zero.
const VERSAO = 13; // 12: 4 categorias (Infraestrutura) · 13: avaliações (pesquisa de satisfação — ADR 0015)
const CHAVE = `central-chamados:simulado:v${VERSAO}`;
const CANAL = "central-chamados:simulado";

export interface EstadoSimulado {
  versao: typeof VERSAO;
  perfis: Perfil[];
  chamados: Chamado[];
  historico: EventoHistorico[];
  mensagens: Mensagem[];
  anexos: Anexo[];
  leituras: Leitura[];
  notificacoes: Notificacao[];
  avaliacoes: Avaliacao[];
}

export function estadoInicial(agora: Date = new Date()): EstadoSimulado {
  const atuais = gerarChamadosExemplo(agora);
  const antigos = gerarAntigosExemplo(agora);
  const chamados = [...antigos.chamados, ...atuais];
  const conversas = gerarConversasExemplo(agora);
  const avaliacoes = gerarAvaliacoesExemplo(chamados);
  // Cada avaliação também aparece no histórico ("Avaliado por Carla: 5 estrelas").
  const avaliados: Omit<EventoHistorico, "id">[] = avaliacoes.map((a) => ({
    chamadoId: a.chamadoId,
    autorId: a.avaliadorId,
    acao: "avaliado",
    de: "concluido",
    para: "concluido",
    detalhe: { nota: String(a.nota) },
    publico: true,
    criadoEm: a.criadoEm,
  }));
  const historico = [
    ...gerarHistoricoExemplo(atuais),
    ...antigos.eventos,
    ...conversas.eventos,
    ...avaliados,
  ]
    .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))
    .map((e, i) => ({ ...e, id: i + 1 }));
  return {
    versao: VERSAO,
    perfis: [...USUARIOS_SIMULADOS, ...OUTROS_PERFIS_EXEMPLO].map((u) => ({ ...u })),
    chamados,
    historico,
    mensagens: conversas.mensagens,
    anexos: conversas.anexos,
    leituras: conversas.leituras,
    notificacoes: [],
    avaliacoes,
  };
}

let emMemoria: EstadoSimulado | null = null;
const ouvintes = new Set<() => void>();
let canal: BroadcastChannel | null = null;

function obterCanal(): BroadcastChannel | null {
  if (canal || typeof BroadcastChannel === "undefined") return canal;
  canal = new BroadcastChannel(CANAL);
  canal.onmessage = () => {
    emMemoria = null; // outra aba gravou: reler do localStorage
    ouvintes.forEach((cb) => cb());
  };
  return canal;
}

function lerDoNavegador(): EstadoSimulado | null {
  try {
    const bruto = globalThis.localStorage?.getItem(CHAVE);
    if (!bruto) return null;
    const estado = JSON.parse(bruto) as EstadoSimulado;
    return estado.versao === VERSAO ? estado : null;
  } catch {
    return null;
  }
}

function gravarNoNavegador(estado: EstadoSimulado): void {
  try {
    globalThis.localStorage?.setItem(CHAVE, JSON.stringify(estado));
  } catch {
    // Navegador sem localStorage (modo privado, cota): segue só em memória.
  }
}

export function lerEstado(): EstadoSimulado {
  if (!emMemoria) {
    emMemoria = lerDoNavegador() ?? estadoInicial();
    gravarNoNavegador(emMemoria);
  }
  return emMemoria;
}

export function gravarEstado(estado: EstadoSimulado): void {
  emMemoria = estado;
  gravarNoNavegador(estado);
  obterCanal()?.postMessage("mudou");
  ouvintes.forEach((cb) => cb());
}

/** Próximo id de uma lista (equivale ao identity do banco). */
export function proximoId(itens: readonly { id: number }[]): number {
  return itens.reduce((maior, item) => Math.max(maior, item.id), 0) + 1;
}

/** Volta aos dados de exemplo (botão "Restaurar dados de exemplo"). */
export async function restaurarExemplos(): Promise<void> {
  await apagarTodosOsArquivos();
  gravarEstado(estadoInicial());
}

export function assinar(callback: () => void): () => void {
  obterCanal();
  ouvintes.add(callback);
  return () => ouvintes.delete(callback);
}

/** Só para testes: esquece o estado em memória. */
export function _reiniciarParaTestes(): void {
  emMemoria = null;
  ouvintes.clear();
}
