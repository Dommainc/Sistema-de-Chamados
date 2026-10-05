// Chat (mockup, tela 5): envio, falha com "tentar de novo" mantendo o texto, faixa offline
// e notas internas invisíveis ao solicitante.

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProvedorToast } from "@/components/ui/Toast";
import { ProvedorDados } from "@/lib/dados/provedor";
import {
  _reiniciarParaTestes,
  estadoInicial,
  gravarEstado,
} from "@/lib/dados/simulada/armazenamento";
import { USUARIOS_SIMULADOS } from "@/lib/dados/simulada/usuarios";
import { ChatChamado } from "./ChatChamado";

const [ANA, , RAFAEL] = USUARIOS_SIMULADOS;

function renderizar(usuario = ANA, chamadoId = 41) {
  return render(
    <ProvedorToast>
      <ProvedorDados usuario={{ id: usuario.id, nome: usuario.nome, papel: usuario.papel }}>
        <ChatChamado chamadoId={chamadoId} />
      </ProvedorDados>
    </ProvedorToast>,
  );
}

function ficarOffline(offline: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(!offline);
  act(() => {
    window.dispatchEvent(new Event(offline ? "offline" : "online"));
  });
}

beforeEach(() => {
  localStorage.clear();
  _reiniciarParaTestes();
  gravarEstado(estadoInicial());
  globalThis.URL.createObjectURL = vi.fn(() => "blob:x");
  globalThis.URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function escrever(texto: string) {
  fireEvent.change(screen.getByRole("textbox", { name: "Mensagem" }), { target: { value: texto } });
  fireEvent.click(screen.getByRole("button", { name: "Enviar mensagem" }));
}

describe("ChatChamado", () => {
  it("mostra o pedido, a resposta do técnico e o evento — sem a nota interna", async () => {
    renderizar();
    expect(await screen.findByText(/Desde ontem o Outlook não recebe/)).toBeInTheDocument();
    expect(screen.getByText(/Consegue abrir o Outlook pelo navegador/)).toBeInTheDocument();
    expect(screen.getByText(/Rafael Lima assumiu o chamado/)).toBeInTheDocument();
    expect(screen.queryByText(/49,8 GB/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Nota interna/)).not.toBeInTheDocument();
  });

  it("a TI vê a nota interna com a etiqueta 'só a TI vê'", async () => {
    renderizar(RAFAEL);
    expect(await screen.findByText(/49,8 GB/)).toBeInTheDocument();
    expect(screen.getByText(/Nota interna · só a TI vê/)).toBeInTheDocument();
  });

  it("enviar mostra a mensagem na conversa", async () => {
    renderizar();
    await screen.findByText(/Consegue abrir o Outlook/);
    escrever("No navegador aparecem sim!");
    // Primeiro o balão provisório ("Enviando..."), depois o definitivo vindo da conversa.
    await waitFor(() => expect(screen.queryByText("Enviando...")).not.toBeInTheDocument());
    expect(await screen.findByText(/voltou para Em atendimento/)).toBeInTheDocument();
    expect(screen.getByText("No navegador aparecem sim!")).toBeInTheDocument();
  });

  it("sem conexão: faixa de aviso, falha com 'tentar de novo' mantendo o texto e reenvio", async () => {
    renderizar();
    await screen.findByText(/Consegue abrir o Outlook/);
    ficarOffline(true);
    expect(
      screen.getByText("Sem conexão. As mensagens novas vão aparecer quando a conexão voltar."),
    ).toBeInTheDocument();

    escrever("Mensagem importante");
    const tentarDeNovo = await screen.findByRole("button", {
      name: "Sua mensagem não foi enviada. Toque para tentar de novo.",
    });
    expect(screen.getByText("Mensagem importante")).toBeInTheDocument();

    ficarOffline(false);
    fireEvent.click(tentarDeNovo);
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /Sua mensagem não foi enviada/ }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Mensagem importante")).toBeInTheDocument();
  });

  it("chamado encerrado: sem campo de resposta e com 'Abrir novo pedido' citando o número", async () => {
    renderizar(ANA, 35);
    expect(await screen.findByText("Este chamado foi encerrado.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Mensagem" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir novo pedido" })).toHaveAttribute(
      "href",
      "/?referente=35",
    );
  });
});
