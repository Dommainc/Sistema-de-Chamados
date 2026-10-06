import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";

// Sem `globals: true` o Testing Library não limpa o DOM sozinho entre os testes.
afterEach(() => {
  cleanup();
});

// findBy*/waitFor esperam até 3 s (padrão: 1 s). Com a suíte inteira rodando em paralelo, as telas que
// leem a camada de dados simulada às vezes passam de 1 s e o teste falhava sem motivo real.
configure({ asyncUtilTimeout: 3000 });

// O jsdom não implementa <dialog>.showModal()/close(); os navegadores modernos sim.
if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
}
