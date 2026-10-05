// Fluxo do passo 2 (mockup, tela 2): erros inline, rascunho mantido, Ctrl+V e envio.

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProvedorToast } from "@/components/ui/Toast";
import { ProvedorDados } from "@/lib/dados/provedor";
import {
  _reiniciarParaTestes,
  estadoInicial,
  gravarEstado,
  lerEstado,
} from "@/lib/dados/simulada/armazenamento";
import { CATEGORIAS } from "@/lib/dados/simulada/exemplos";
import { USUARIOS_SIMULADOS } from "@/lib/dados/simulada/usuarios";
import { FormularioChamado } from "./FormularioChamado";
import { limparRascunho } from "./rascunho";

const navegacao = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => navegacao,
  usePathname: () => "/abrir/2",
  useSearchParams: () => new URLSearchParams(),
}));

const ANA = USUARIOS_SIMULADOS[0];
const INTERNET = CATEGORIAS.find((c) => c.nome === "Internet, rede ou VPN")!;

function renderizar(referente: number | null = null) {
  return render(
    <ProvedorToast>
      <ProvedorDados usuario={{ id: ANA.id, nome: ANA.nome, papel: ANA.papel }}>
        <FormularioChamado categoriaId={INTERNET.id} referente={referente} />
      </ProvedorDados>
    </ProvedorToast>,
  );
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  limparRascunho();
  _reiniciarParaTestes();
  gravarEstado(estadoInicial());
  navegacao.replace.mockReset();
  globalThis.URL.createObjectURL = vi.fn(() => "blob:previa");
  globalThis.URL.revokeObjectURL = vi.fn();
});

describe("FormularioChamado", () => {
  it("mostra os campos da categoria, com seleção em cartões e a previsão", async () => {
    renderizar();
    expect(await screen.findByText("Conte o que está acontecendo")).toBeInTheDocument();
    expect(screen.getByLabelText(/Resumo do problema/)).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "O escritório ou a obra inteira" }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/Previsão de atendimento/)).toBeInTheDocument();
  });

  it("enviar vazio mostra o erro embaixo de cada campo obrigatório", async () => {
    renderizar();
    fireEvent.click(await screen.findByRole("button", { name: "Enviar pedido" }));
    expect(
      await screen.findByText("Preencha o campo Resumo do problema para continuar."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Preencha o campo Quem está sem conexão? para continuar."),
    ).toBeInTheDocument();
    expect(navegacao.replace).not.toHaveBeenCalled();
  });

  it("preenchido, abre o chamado e vai para a confirmação", async () => {
    renderizar();
    fireEvent.change(await screen.findByLabelText(/Resumo do problema/), {
      target: { value: "Sem internet na obra Recreio" },
    });
    fireEvent.click(screen.getByRole("radio", { name: "Só eu" }));
    fireEvent.change(screen.getByLabelText(/Onde você está/), {
      target: { value: "Obra Recreio" },
    });
    fireEvent.change(screen.getByLabelText(/Descreva o que está acontecendo/), {
      target: { value: "Roteador com luz vermelha" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar pedido" }));

    await waitFor(() => expect(navegacao.replace).toHaveBeenCalled());
    const criado = lerEstado().chamados.at(-1)!;
    expect(criado.titulo).toBe("Sem internet na obra Recreio");
    expect(navegacao.replace).toHaveBeenCalledWith(`/abrir/pronto/${criado.id}`);
  });

  it("o que foi digitado fica salvo para o 'Voltar'", async () => {
    const { unmount } = renderizar();
    fireEvent.change(await screen.findByLabelText(/Resumo do problema/), {
      target: { value: "Rascunho guardado" },
    });
    unmount();
    renderizar();
    expect(await screen.findByLabelText(/Resumo do problema/)).toHaveValue("Rascunho guardado");
  });

  it("novo pedido a partir de um chamado encerrado já cita o número", async () => {
    renderizar(42);
    expect(await screen.findByLabelText(/Resumo do problema/)).toHaveValue(
      "Referente ao chamado #42: ",
    );
  });

  it("Ctrl+V com imagem vira anexo print-AAAAMMDD-HHMMSS.png", async () => {
    renderizar();
    const campo = await screen.findByLabelText(/Descreva o que está acontecendo/);
    const imagem = new File(["png"], "image.png", { type: "image/png" });
    fireEvent.paste(campo, {
      clipboardData: {
        items: [{ kind: "file", type: "image/png", getAsFile: () => imagem }],
        files: [imagem],
      },
    });
    expect(await screen.findByText(/^print-\d{8}-\d{6}\.png$/)).toBeInTheDocument();
  });

  it("colar texto no campo não cria anexo", async () => {
    renderizar();
    const campo = await screen.findByLabelText(/Descreva o que está acontecendo/);
    fireEvent.paste(campo, {
      clipboardData: { items: [{ kind: "string", type: "text/plain" }], files: [] },
    });
    expect(screen.queryByText(/^print-/)).not.toBeInTheDocument();
  });

  it("colar sem imagem na área de anexos avisa COLAR_SEM_IMAGEM", async () => {
    renderizar();
    const area = await screen.findByRole("button", { name: /Tirar foto ou anexar arquivo/ });
    fireEvent.paste(area, { clipboardData: { items: [], files: [] } });
    expect(
      await screen.findByText(
        "Não encontramos uma imagem para colar. Copie o print e tente de novo.",
      ),
    ).toBeInTheDocument();
  });
});
