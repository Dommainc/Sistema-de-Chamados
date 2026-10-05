import { describe, expect, it } from "vitest";
import { STATUS } from "./dominio/tipos";
import { rotuloStatus } from "./status";

describe("rotuloStatus", () => {
  it("tem rótulo para todos os 6 status nos dois perfis", () => {
    for (const status of STATUS) {
      expect(rotuloStatus(status, "solicitante").texto).not.toBe("");
      expect(rotuloStatus(status, "ti").texto).not.toBe("");
    }
  });

  it("segue a tabela da 1A-3", () => {
    const esperado = {
      pendente: ["Pendente", "Pendente"],
      em_andamento: ["Em andamento", "Em andamento"],
      aguardando_usuario: ["Aguardando sua resposta", "Aguardando usuário"],
      transferido: ["Em andamento", "Transferido"],
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
