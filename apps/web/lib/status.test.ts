import { describe, expect, it } from "vitest";
import { STATUS } from "./dominio/tipos";
import { passoProgresso, rotuloStatus } from "./status";

describe("rotuloStatus", () => {
  it("tem rótulo para todos os 6 status nos dois perfis", () => {
    for (const status of STATUS) {
      expect(rotuloStatus(status, "solicitante").texto).not.toBe("");
      expect(rotuloStatus(status, "ti").texto).not.toBe("");
    }
  });

  it("segue a tabela do docs/ui-ux.md", () => {
    const esperado = {
      pendente: ["Recebido", "Novo"],
      em_andamento: ["Em atendimento", "Em atendimento"],
      aguardando_usuario: ["Aguardando sua resposta", "Aguardando usuário"],
      transferido: ["Em atendimento", "Transferido"],
      concluido: ["Concluído", "Concluído"],
      cancelado: ["Cancelado", "Cancelado"],
    } as const;
    for (const status of STATUS) {
      expect(rotuloStatus(status, "solicitante").texto).toBe(esperado[status][0]);
      expect(rotuloStatus(status, "ti").texto).toBe(esperado[status][1]);
    }
  });

  it("solicitante não vê que o chamado foi transferido", () => {
    expect(rotuloStatus("transferido", "solicitante")).toEqual(
      rotuloStatus("em_andamento", "solicitante"),
    );
  });

  it("só 'Aguardando sua resposta' tem destaque, e só para o solicitante", () => {
    for (const status of STATUS) {
      expect(rotuloStatus(status, "solicitante").destaque).toBe(status === "aguardando_usuario");
      expect(rotuloStatus(status, "ti").destaque).toBe(false);
    }
  });
});

describe("passoProgresso (3 passos, ADR 0005)", () => {
  it("mapeia cada status para o passo certo", () => {
    expect(passoProgresso("pendente")).toEqual({ atual: 0, cancelado: false });
    expect(passoProgresso("em_andamento")).toEqual({ atual: 1, cancelado: false });
    expect(passoProgresso("aguardando_usuario")).toEqual({ atual: 1, cancelado: false });
    expect(passoProgresso("transferido")).toEqual({ atual: 1, cancelado: false });
    expect(passoProgresso("concluido")).toEqual({ atual: 2, cancelado: false });
    expect(passoProgresso("cancelado").cancelado).toBe(true);
  });
});
