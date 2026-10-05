import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BarraProgresso } from "./BarraProgresso";

describe("BarraProgresso (3 passos, ADR 0005)", () => {
  it("mostra Recebido, Em atendimento e Concluído", () => {
    render(<BarraProgresso status="pendente" />);
    for (const passo of ["Recebido", "Em atendimento", "Concluído"]) {
      expect(screen.getByText(passo)).toBeInTheDocument();
    }
    expect(screen.queryByText("Resolvido")).not.toBeInTheDocument();
  });

  it("marca o passo atual", () => {
    render(<BarraProgresso status="aguardando_usuario" />);
    expect(screen.getByText("Em atendimento").closest("li")).toHaveAttribute(
      "aria-current",
      "step",
    );
  });

  it("concluído não tem passo 'atual' e cancelado não mostra a barra", () => {
    const { container, rerender } = render(<BarraProgresso status="concluido" />);
    expect(container.querySelector('[aria-current="step"]')).toBeNull();
    rerender(<BarraProgresso status="cancelado" />);
    expect(container.querySelector("ol")).toBeNull();
  });
});
