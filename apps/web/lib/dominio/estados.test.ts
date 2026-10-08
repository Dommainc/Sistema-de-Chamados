// Uma verificação por linha da tabela do CLAUDE.md (ADR 0005) + transições proibidas.

import { describe, expect, it } from "vitest";
import type { CodigoErro } from "@/lib/erros/catalogo";
import {
  TODAS_AS_ACOES,
  acoesDisponiveis,
  validarAcao,
  type AcaoChamado,
  type Ator,
  type DadosAcao,
} from "./estados";
import { STATUS, type StatusChamado } from "./tipos";

const SOL: Ator = { id: "sol", papel: "solicitante" };
const OUTRO_SOL: Ator = { id: "outro", papel: "solicitante" };
const TEC: Ator = { id: "tec", papel: "ti" };
const TEC2: Ator = { id: "tec2", papel: "ti" };

function chamado(status: StatusChamado, responsavelId: string | null = null) {
  return { status, responsavelId, solicitanteId: SOL.id };
}

const MOTIVO: DadosAcao = { motivo: "Motivo de teste" };

function codigoDoErro(fn: () => unknown): CodigoErro | null {
  try {
    fn();
    return null;
  } catch (e) {
    return (e as { codigo: CodigoErro }).codigo;
  }
}

describe("tabela de transições (CLAUDE.md)", () => {
  it("pendente → em_andamento: TI assume e vira responsável", () => {
    expect(validarAcao(chamado("pendente"), "assumir", TEC)).toEqual({
      para: "em_andamento",
      responsavelId: TEC.id,
    });
  });

  it("pendente → cancelado: só a TI, com motivo (o solicitante recebe a orientação)", () => {
    expect(validarAcao(chamado("pendente"), "cancelar", TEC, MOTIVO).para).toBe("cancelado");
    expect(codigoDoErro(() => validarAcao(chamado("pendente"), "cancelar", SOL, MOTIVO))).toBe(
      "CANCELAMENTO_NAO_PERMITIDO",
    );
  });

  it("sem aguardar usuário, retomar e devolver à fila (ADR 0014)", () => {
    for (const acao of ["aguardar_usuario", "retomar", "devolver_fila"]) {
      expect(TODAS_AS_ACOES as readonly string[]).not.toContain(acao);
    }
  });

  it("aguardando_usuario → em_andamento: só quando o solicitante responde (automático)", () => {
    expect(validarAcao(chamado("aguardando_usuario", TEC.id), "resposta_solicitante", SOL)).toEqual(
      {
        para: "em_andamento",
        responsavelId: TEC.id,
      },
    );
  });

  it("em_andamento/aguardando → transferido: TI, com destino e motivo", () => {
    for (const de of ["em_andamento", "aguardando_usuario"] as const) {
      expect(
        validarAcao(chamado(de, TEC.id), "transferir", TEC, { ...MOTIVO, destinoId: TEC2.id }),
      ).toEqual({ para: "transferido", responsavelId: TEC2.id });
    }
  });

  it("transferido → em_andamento: só o técnico de destino assume direto", () => {
    expect(validarAcao(chamado("transferido", TEC2.id), "assumir", TEC2).para).toBe("em_andamento");
    expect(codigoDoErro(() => validarAcao(chamado("transferido", TEC2.id), "assumir", TEC))).toBe(
      "SEM_PERMISSAO",
    );
  });

  it("em_andamento/aguardando → concluido: TI, inclusive sem resposta do solicitante", () => {
    for (const de of ["em_andamento", "aguardando_usuario"] as const) {
      expect(validarAcao(chamado(de, TEC.id), "concluir", TEC).para).toBe("concluido");
    }
  });

  it("em_andamento/aguardando/transferido → cancelado: TI, com motivo", () => {
    for (const de of ["em_andamento", "aguardando_usuario", "transferido"] as const) {
      expect(validarAcao(chamado(de, TEC.id), "cancelar", TEC, MOTIVO).para).toBe("cancelado");
    }
  });

  it("concluido e cancelado são finais: nenhuma ação", () => {
    for (const de of ["concluido", "cancelado"] as const) {
      for (const ator of [SOL, TEC]) {
        expect(acoesDisponiveis(chamado(de, TEC.id), ator)).toEqual([]);
      }
      expect(codigoDoErro(() => validarAcao(chamado(de, TEC.id), "assumir", TEC))).toBe(
        "TRANSICAO_INVALIDA",
      );
    }
  });
});

describe("regras de exigência", () => {
  it("cancelar e transferir sem motivo → MOTIVO_OBRIGATORIO", () => {
    expect(
      codigoDoErro(() => validarAcao(chamado("pendente"), "cancelar", TEC, { motivo: " " })),
    ).toBe("MOTIVO_OBRIGATORIO");
    expect(
      codigoDoErro(() =>
        validarAcao(chamado("em_andamento", TEC.id), "transferir", TEC, { destinoId: TEC2.id }),
      ),
    ).toBe("MOTIVO_OBRIGATORIO");
  });

  it("transferir sem destino → CAMPO_OBRIGATORIO; para o mesmo responsável → TRANSICAO_INVALIDA", () => {
    expect(
      codigoDoErro(() => validarAcao(chamado("em_andamento", TEC.id), "transferir", TEC, MOTIVO)),
    ).toBe("CAMPO_OBRIGATORIO");
    expect(
      codigoDoErro(() =>
        validarAcao(chamado("em_andamento", TEC.id), "transferir", TEC, {
          ...MOTIVO,
          destinoId: TEC.id,
        }),
      ),
    ).toBe("TRANSICAO_INVALIDA");
  });

  it("solicitante cancelando depois do início do atendimento → CANCELAMENTO_NAO_PERMITIDO", () => {
    for (const de of ["em_andamento", "aguardando_usuario", "transferido"] as const) {
      expect(codigoDoErro(() => validarAcao(chamado(de, TEC.id), "cancelar", SOL, MOTIVO))).toBe(
        "CANCELAMENTO_NAO_PERMITIDO",
      );
    }
  });

  it("solicitante não faz ações da TI → SEM_PERMISSAO", () => {
    for (const acao of ["assumir", "transferir", "concluir"] as AcaoChamado[]) {
      expect(
        codigoDoErro(() => validarAcao(chamado("em_andamento", TEC.id), acao, SOL, MOTIVO)),
      ).toBe("SEM_PERMISSAO");
    }
  });

  it("outro solicitante não cancela nem responde chamado alheio", () => {
    expect(
      codigoDoErro(() => validarAcao(chamado("pendente"), "cancelar", OUTRO_SOL, MOTIVO)),
    ).toBe("SEM_PERMISSAO");
    expect(
      codigoDoErro(() =>
        validarAcao(chamado("aguardando_usuario", TEC.id), "resposta_solicitante", OUTRO_SOL),
      ),
    ).toBe("SEM_PERMISSAO");
  });

  it("mensagem de transição inválida usa os rótulos do perfil", () => {
    try {
      validarAcao(chamado("concluido", TEC.id), "transferir", TEC, MOTIVO);
    } catch (e) {
      expect((e as Error).message).toBe("Não é possível mudar de Concluído para Transferido.");
    }
  });
});

describe("acoesDisponiveis", () => {
  it("solicitante não tem botões de ação (nem Cancelar)", () => {
    for (const de of STATUS) {
      expect(acoesDisponiveis(chamado(de, TEC.id), SOL)).toEqual([]);
    }
  });

  it("TI em aguardando_usuario: transferir, concluir, cancelar", () => {
    expect(acoesDisponiveis(chamado("aguardando_usuario", TEC.id), TEC).sort()).toEqual(
      ["cancelar", "concluir", "transferir"].sort(),
    );
  });

  it("TI que não é o destino de um transferido: só cancelar", () => {
    expect(acoesDisponiveis(chamado("transferido", TEC2.id), TEC)).toEqual(["cancelar"]);
  });
});
