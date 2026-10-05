// Regra de acesso às áreas (docs/fases/1A-3-experiencia-por-perfil.md, Entrega 1, item 4).
// Função pura, usada pelo proxy.ts e testada isoladamente.
// É experiência, não segurança: a segurança de verdade é RLS + API.

import type { Papel } from "@/lib/dominio/tipos";

export type DecisaoRota = { tipo: "seguir" } | { tipo: "redirecionar"; para: string };

const PUBLICAS = ["/login"];

export function inicioDoPapel(papel: Papel): string {
  return papel === "ti" ? "/atendimento" : "/";
}

function comecaCom(caminho: string, prefixo: string): boolean {
  return caminho === prefixo || caminho.startsWith(`${prefixo}/`);
}

const AREA_SOLICITANTE = ["/meus-chamados", "/primeiro-acesso", "/abrir"];
const AREA_TI = ["/atendimento"];

export function decidirRota(caminho: string, papel: Papel | null): DecisaoRota {
  const publica = PUBLICAS.some((p) => comecaCom(caminho, p));

  if (!papel) {
    return publica ? { tipo: "seguir" } : { tipo: "redirecionar", para: "/login" };
  }

  if (publica) {
    return { tipo: "redirecionar", para: inicioDoPapel(papel) };
  }

  if (papel === "solicitante" && AREA_TI.some((p) => comecaCom(caminho, p))) {
    return { tipo: "redirecionar", para: "/sem-acesso" };
  }

  if (papel === "ti" && (caminho === "/" || AREA_SOLICITANTE.some((p) => comecaCom(caminho, p)))) {
    return { tipo: "redirecionar", para: "/atendimento" };
  }

  return { tipo: "seguir" };
}

/** Link universal /chamados/42 (usado nos avisos do Teams): leva cada papel à sua tela. */
export function destinoLinkUniversal(id: string, papel: Papel): string {
  if (!/^\d+$/.test(id)) return inicioDoPapel(papel);
  return papel === "ti" ? `/atendimento/${id}` : `/meus-chamados/${id}`;
}

/** Caminhos do fluxo "Abrir chamado" em cada área (a TI também abre chamado, ADR 0005). */
export interface CaminhosAbertura {
  /** Passo 1: escolher o assunto. */
  inicio: string;
  /** Passo 2: formulário da categoria. */
  formulario: (categoriaId: number) => string;
  /** Passo 3: confirmação. */
  pronto: (chamadoId: number) => string;
  /** Tela de acompanhamento do chamado aberto. */
  acompanhar: (chamadoId: number) => string;
}

export function caminhosAbertura(papel: Papel): CaminhosAbertura {
  if (papel === "ti") {
    return {
      inicio: "/atendimento/novo",
      formulario: (id) => `/atendimento/novo/${id}`,
      pronto: (id) => `/atendimento/novo/pronto/${id}`,
      acompanhar: (id) => `/atendimento/${id}`,
    };
  }
  return {
    inicio: "/",
    formulario: (id) => `/abrir/${id}`,
    pronto: (id) => `/abrir/pronto/${id}`,
    acompanhar: (id) => `/meus-chamados/${id}`,
  };
}

/** Mantém o "?referente=42" (novo pedido a partir de um chamado encerrado) entre os passos. */
export function comReferente(caminho: string, referente: number | null): string {
  return referente ? `${caminho}?referente=${referente}` : caminho;
}

/** Lê o "?referente=42" da URL; qualquer outra coisa vira nulo. */
export function lerReferente(valor: string | string[] | undefined): number | null {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  return texto && /^\d+$/.test(texto) ? Number(texto) : null;
}
