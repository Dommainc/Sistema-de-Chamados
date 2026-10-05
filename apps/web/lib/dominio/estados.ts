// Máquina de estados do chamado — espelho em TypeScript da tabela do CLAUDE.md (ADR 0005).
// Na versão real a fonte da verdade é a API (apps/api/app/dominio/estados.py e GET /chamados/{id}/acoes);
// aqui ela serve à versão simulada e para decidir quais botões mostrar.

import { rotuloStatus } from "@/lib/status";
import { ErroApp } from "@/lib/erros/catalogo";
import { estaEncerrado, type Chamado, type Papel, type StatusChamado } from "./tipos";

export type AcaoChamado =
  | "assumir"
  | "aguardar_usuario"
  | "retomar"
  | "resposta_solicitante"
  | "transferir"
  | "devolver_fila"
  | "concluir"
  | "cancelar";

export interface Ator {
  id: string;
  papel: Papel;
}

export interface DadosAcao {
  motivo?: string;
  /** Técnico de destino (transferir). */
  destinoId?: string;
}

export interface ResultadoTransicao {
  para: StatusChamado;
  responsavelId: string | null;
}

type ChamadoParaTransicao = Pick<Chamado, "status" | "responsavelId" | "solicitanteId">;

const DESTINO: Record<AcaoChamado, StatusChamado> = {
  assumir: "em_andamento",
  aguardar_usuario: "aguardando_usuario",
  retomar: "em_andamento",
  resposta_solicitante: "em_andamento",
  transferir: "transferido",
  devolver_fila: "pendente",
  concluir: "concluido",
  cancelar: "cancelado",
};

/** De quais status cada ação parte. */
const ORIGENS: Record<AcaoChamado, readonly StatusChamado[]> = {
  assumir: ["pendente", "transferido"],
  aguardar_usuario: ["em_andamento"],
  retomar: ["aguardando_usuario"],
  resposta_solicitante: ["aguardando_usuario"],
  transferir: ["em_andamento", "aguardando_usuario"],
  devolver_fila: ["em_andamento", "aguardando_usuario", "transferido"],
  concluir: ["em_andamento", "aguardando_usuario"],
  cancelar: ["pendente", "em_andamento", "aguardando_usuario", "transferido"],
};

export const TODAS_AS_ACOES = Object.keys(DESTINO) as AcaoChamado[];

function exigirMotivo(dados: DadosAcao): void {
  if ((dados.motivo ?? "").trim().length < 3) throw new ErroApp("MOTIVO_OBRIGATORIO");
}

function transicaoInvalida(de: StatusChamado, para: StatusChamado, papel: Papel): ErroApp {
  return new ErroApp("TRANSICAO_INVALIDA", {
    de: rotuloStatus(de, papel).texto,
    para: rotuloStatus(para, papel).texto,
  });
}

/**
 * Valida a ação e devolve o novo status e responsável. Lança ErroApp:
 * TRANSICAO_INVALIDA, MOTIVO_OBRIGATORIO, CANCELAMENTO_NAO_PERMITIDO, SEM_PERMISSAO ou CAMPO_OBRIGATORIO.
 */
export function validarAcao(
  chamado: ChamadoParaTransicao,
  acao: AcaoChamado,
  ator: Ator,
  dados: DadosAcao = {},
): ResultadoTransicao {
  const de = chamado.status;
  const para = DESTINO[acao];
  const ehTi = ator.papel === "ti";
  const ehDono = chamado.solicitanteId === ator.id;

  // Quem pode tentar cada ação.
  if (acao === "resposta_solicitante") {
    if (!ehDono) throw new ErroApp("SEM_PERMISSAO");
  } else if (acao === "cancelar") {
    if (!ehTi && !ehDono) throw new ErroApp("SEM_PERMISSAO");
  } else if (!ehTi) {
    throw new ErroApp("SEM_PERMISSAO");
  }

  if (estaEncerrado(de) || !ORIGENS[acao].includes(de)) {
    // Solicitante cancelando depois que a TI começou: mensagem própria do catálogo.
    if (acao === "cancelar" && !ehTi && !estaEncerrado(de)) {
      throw new ErroApp("CANCELAMENTO_NAO_PERMITIDO");
    }
    throw transicaoInvalida(de, para, ator.papel);
  }

  switch (acao) {
    case "assumir":
      // Transferido: só o técnico de destino assume direto (os outros devolvem à fila).
      if (de === "transferido" && chamado.responsavelId !== ator.id) {
        throw new ErroApp("SEM_PERMISSAO");
      }
      return { para, responsavelId: ator.id };

    case "transferir": {
      const destino = dados.destinoId?.trim();
      if (!destino) throw new ErroApp("CAMPO_OBRIGATORIO", { campo: "Técnico de destino" });
      if (destino === chamado.responsavelId) throw transicaoInvalida(de, para, ator.papel);
      exigirMotivo(dados);
      return { para, responsavelId: destino };
    }

    case "devolver_fila":
      exigirMotivo(dados);
      return { para, responsavelId: null };

    case "cancelar":
      if (!ehTi && de !== "pendente") throw new ErroApp("CANCELAMENTO_NAO_PERMITIDO");
      exigirMotivo(dados);
      return { para, responsavelId: chamado.responsavelId };

    default:
      return { para, responsavelId: chamado.responsavelId };
  }
}

/** Ações que o ator pode fazer agora (para mostrar só os botões permitidos). */
export function acoesDisponiveis(chamado: ChamadoParaTransicao, ator: Ator): AcaoChamado[] {
  const dadosValidos = (acao: AcaoChamado): DadosAcao => ({
    motivo: "motivo válido",
    destinoId: acao === "transferir" ? "__outro_tecnico__" : undefined,
  });
  return TODAS_AS_ACOES.filter((acao) => {
    if (acao === "resposta_solicitante") return false; // automática, não é botão
    try {
      validarAcao(chamado, acao, ator, dadosValidos(acao));
      return true;
    } catch {
      return false;
    }
  });
}
