// Estado da versão simulada, guardado no navegador (localStorage) e avisado entre abas
// (BroadcastChannel) para simular o tempo real. Sem navegador (servidor/testes), fica só em memória.

import type { Chamado, Perfil } from "@/lib/dominio/tipos";
import { gerarChamadosExemplo } from "./exemplos";
import { OUTROS_PERFIS_EXEMPLO, USUARIOS_SIMULADOS } from "./usuarios";

// Mude a versão quando o formato ou os dados de exemplo mudarem: o navegador recomeça do zero.
const CHAVE = "central-chamados:simulado:v2";
const CANAL = "central-chamados:simulado";

export interface EstadoSimulado {
  versao: 2;
  perfis: Perfil[];
  chamados: Chamado[];
}

export function estadoInicial(agora: Date = new Date()): EstadoSimulado {
  return {
    versao: 2,
    perfis: [...USUARIOS_SIMULADOS, ...OUTROS_PERFIS_EXEMPLO].map((u) => ({ ...u })),
    chamados: gerarChamadosExemplo(agora),
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
    return estado.versao === 2 ? estado : null;
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

/** Volta aos dados de exemplo (botão "Restaurar dados de exemplo"). */
export function restaurarExemplos(): void {
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
