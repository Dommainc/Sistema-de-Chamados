import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BadgeStatus } from "./BadgeStatus";

describe("BadgeStatus", () => {
  it("mostra o rótulo do perfil", () => {
    render(<BadgeStatus status="aguardando_usuario" papel="solicitante" />);
    expect(screen.getByText("Aguardando sua resposta")).toBeInTheDocument();
  });

  it("técnico vê 'Transferido'; solicitante vê 'Em andamento'", () => {
    const { rerender } = render(<BadgeStatus status="transferido" papel="ti" />);
    expect(screen.getByText("Transferido")).toBeInTheDocument();
    rerender(<BadgeStatus status="transferido" papel="solicitante" />);
    expect(screen.getByText("Em andamento")).toBeInTheDocument();
  });
});
