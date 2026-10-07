// Tela de erro inesperado (docs/escopo.md, seção 8): mensagem do catálogo com a referência ERR-XXXX,
// nunca a mensagem técnica do erro.

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ErroInesperado from "./error";

describe("tela de erro inesperado", () => {
  it("mostra a mensagem amigável com a referência e não mostra o erro técnico", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const retry = vi.fn();
    render(<ErroInesperado error={new Error("relation chamados does not exist")} retry={retry} />);

    const texto = screen.getByText(/Algo deu errado do nosso lado/);
    expect(texto.textContent).toMatch(
      /^Algo deu errado do nosso lado\. Tente novamente\. Se continuar, informe o código ERR-[0-9A-F]{4} para a TI\.$/,
    );
    expect(screen.queryByText(/relation chamados/)).not.toBeInTheDocument();
    // A mesma referência vai para o log (para a TI achar o erro).
    const ref = texto.textContent?.match(/ERR-[0-9A-F]{4}/)?.[0];
    expect(log.mock.calls.some((c) => String(c[0]).includes(ref ?? "?"))).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(retry).toHaveBeenCalled();
    log.mockRestore();
  });
});
