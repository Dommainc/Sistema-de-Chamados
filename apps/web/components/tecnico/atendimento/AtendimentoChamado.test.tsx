// Tela de atendimento (mockup, tela 7). Sem CSS nos testes: versão celular e computador aparecem juntas,
// por isso alguns botões existem em dobro (*AllBy*).

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProvedorToast } from "@/components/ui/Toast";
import { ProvedorDados } from "@/lib/dados/provedor";
import {
  _reiniciarParaTestes,
  estadoInicial,
  gravarEstado,
  lerEstado,
} from "@/lib/dados/simulada/armazenamento";
import { USUARIOS_SIMULADOS } from "@/lib/dados/simulada/usuarios";
import { AtendimentoChamado } from "./AtendimentoChamado";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/atendimento/41",
  useSearchParams: () => new URLSearchParams(),
}));

const [, , RAFAEL, THIAGO] = USUARIOS_SIMULADOS;

function renderizar(usuario = RAFAEL, id = 41) {
  return render(
    <ProvedorToast>
      <ProvedorDados usuario={{ id: usuario.id, nome: usuario.nome, papel: usuario.papel }}>
        <AtendimentoChamado id={id} />
      </ProvedorDados>
    </ProvedorToast>,
  );
}

const painelAcoes = () => screen.getByRole("region", { name: "Ações" });
const chamado = (id: number) => lerEstado().chamados.find((c) => c.id === id)!;

beforeEach(() => {
  localStorage.clear();
  _reiniciarParaTestes();
  gravarEstado(estadoInicial());
  globalThis.URL.createObjectURL = vi.fn(() => "blob:x");
  globalThis.URL.revokeObjectURL = vi.fn();
});

describe("AtendimentoChamado", () => {
  it("mostra a conversa (sem notas internas), solicitante com contato, pedido e histórico", async () => {
    renderizar();
    expect(await screen.findByText(/Consegue abrir o Outlook pelo navegador/)).toBeInTheDocument();
    expect(screen.queryByText(/49,8 GB/)).not.toBeInTheDocument();
    const solicitante = await screen.findByRole("region", { name: "Solicitante" });
    expect(within(solicitante).getByText("Ana Souza")).toBeInTheDocument();
    expect(within(solicitante).getByText("ana@teste.local")).toBeInTheDocument();
    expect(within(solicitante).getByRole("link", { name: "Falar no Teams" })).toHaveAttribute(
      "href",
      "https://teams.microsoft.com/l/chat/0/0?users=ana%40teste.local",
    );
    const historico = await screen.findByRole("region", { name: "Histórico" });
    expect(within(historico).getByText("Aberto por Ana Souza")).toBeInTheDocument();
    expect(within(historico).getByText("Em atendimento → Aguardando usuário")).toBeInTheDocument();
  });

  it("em 'Aguardando usuário' as ações são só: concluir, transferir e cancelar (ADR 0014)", async () => {
    renderizar();
    await screen.findByText(/Consegue abrir o Outlook pelo navegador/);
    const nomes = within(painelAcoes())
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-label") ?? b.textContent);
    expect(nomes).toEqual(["Marcar como concluído", "Transferir", "Cancelar chamado"]);
  });

  it("Relato técnico: aba própria com as notas e o contador; anotar grava como interna", async () => {
    renderizar();
    await screen.findByText(/Consegue abrir o Outlook pelo navegador/);
    const aba = await screen.findByRole("tab", { name: /Relato técnico\s*1/ });
    fireEvent.click(aba);
    expect(await screen.findByText(/49,8 GB/)).toBeInTheDocument();
    expect(screen.getByText(/Só a TI vê o relato técnico/)).toBeInTheDocument();
    expect(screen.queryByText(/Consegue abrir o Outlook pelo navegador/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "Anotação" }), {
      target: { value: "Verificar licença do Office" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar ao relato" }));
    await waitFor(() =>
      expect(lerEstado().mensagens.at(-1)).toMatchObject({
        conteudo: "Verificar licença do Office",
        interna: true,
      }),
    );
    expect(await screen.findByRole("tab", { name: /Relato técnico\s*2/ })).toBeInTheDocument();
  });

  it("responder na conversa nunca grava como interna", async () => {
    renderizar();
    await screen.findByText(/Consegue abrir o Outlook pelo navegador/);
    fireEvent.change(screen.getByRole("textbox", { name: "Mensagem" }), {
      target: { value: "Pode testar de novo?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar mensagem" }));
    await waitFor(() =>
      expect(lerEstado().mensagens.at(-1)).toMatchObject({ conteudo: "Pode testar de novo?" }),
    );
    expect(lerEstado().mensagens.at(-1)?.interna).toBe(false);
  });

  it("concluir pelo modal encerra o chamado, mesmo sem resposta do solicitante", async () => {
    renderizar();
    await screen.findByText(/Consegue abrir o Outlook pelo navegador/);
    fireEvent.click(within(painelAcoes()).getByRole("button", { name: "Marcar como concluído" }));
    const modal = await screen.findByRole("dialog", { hidden: true });
    fireEvent.click(
      within(modal).getByRole("button", { name: "Marcar como concluído", hidden: true }),
    );
    await waitFor(() => expect(chamado(41).status).toBe("concluido"));
    expect(await screen.findByText("Chamado #41 concluído.")).toBeInTheDocument();
  });

  it("transferir exige técnico e motivo; depois grava a transferência", async () => {
    renderizar();
    await screen.findByText(/Consegue abrir o Outlook pelo navegador/);
    fireEvent.click(within(painelAcoes()).getByRole("button", { name: "Transferir" }));
    const modal = await screen.findByRole("dialog", { hidden: true });
    const confirmar = () =>
      fireEvent.click(within(modal).getByRole("button", { name: "Transferir", hidden: true }));

    confirmar();
    expect(
      await within(modal).findByText("Preencha o campo Técnico de destino para continuar."),
    ).toBeInTheDocument();

    fireEvent.change(within(modal).getByRole("combobox", { hidden: true }), {
      target: { value: THIAGO.id },
    });
    confirmar();
    expect(await within(modal).findByText("Informe o motivo para continuar.")).toBeInTheDocument();

    fireEvent.change(within(modal).getByRole("textbox", { hidden: true }), {
      target: { value: "Thiago cuida de e-mail" },
    });
    confirmar();
    await waitFor(() =>
      expect(chamado(41)).toMatchObject({ status: "transferido", responsavelId: THIAGO.id }),
    );
    // O motivo vai para o Relato técnico.
    fireEvent.click(screen.getByRole("tab", { name: /Relato técnico/ }));
    const relato = await screen.findByRole("list", { name: "Relato técnico do chamado" });
    expect(within(relato).getByText("Você transferiu para Thiago Martins")).toBeInTheDocument();
    expect(within(relato).getByText(/Thiago cuida de e-mail/)).toBeInTheDocument();
  });

  it("não iniciado: tudo travado (prazo, prioridade, chat, relato) até clicar em Iniciar", async () => {
    renderizar(RAFAEL, 34);
    expect(await screen.findByText(/Chamado ainda não iniciado/)).toBeInTheDocument();
    const prazo = screen.getByRole("region", { name: "Prazo" });
    expect(within(prazo).queryByRole("button", { name: "Definir prazo" })).not.toBeInTheDocument();
    const prioridade = screen.getByRole("region", { name: "Prioridade" });
    expect(within(prioridade).getByRole("button", { name: "Alta" })).toBeDisabled();
    expect(
      await screen.findByText("Inicie o chamado para conversar com Diego."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Mensagem" })).not.toBeInTheDocument();
  });

  it("prioridade: Alta grava, avisa com toast e marca o botão", async () => {
    renderizar(); // #41, em atendimento
    const prioridade = await screen.findByRole("region", { name: "Prioridade" });
    fireEvent.click(within(prioridade).getByRole("button", { name: "Alta" }));
    await waitFor(() => expect(chamado(41).prioridade).toBe("alta"));
    expect(await screen.findByText("Prioridade do chamado #41: Alta.")).toBeInTheDocument();
    expect(within(prioridade).getByRole("button", { name: "Alta" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("Definir prazo: depois de iniciar, atalho + confirmar grava e mostra no histórico", async () => {
    renderizar(RAFAEL, 34);
    fireEvent.click(
      within(await screen.findByRole("region", { name: "Ações" })).getByRole("button", {
        name: "Iniciar",
      }),
    );
    await waitFor(() => expect(chamado(34).status).toBe("em_andamento"));
    const prazo = await screen.findByRole("region", { name: "Prazo" });
    expect(within(prazo).getByText("Sem prazo")).toBeInTheDocument();
    await within(prazo).findByRole("button", { name: "Definir prazo" });
    fireEvent.click(within(prazo).getByRole("button", { name: "Definir prazo" }));
    const modal = await screen.findByRole("dialog", { name: "Definir prazo", hidden: true });
    fireEvent.click(within(modal).getByRole("button", { name: "Amanhã 18h", hidden: true }));
    expect(within(modal).queryByRole("textbox", { hidden: true })).not.toBeInTheDocument(); // sem motivo
    fireEvent.click(within(modal).getByRole("button", { name: "Definir prazo", hidden: true }));
    await waitFor(() => expect(chamado(34).prazoSla).not.toBeNull());
    expect(await screen.findByText(/Prazo definido por Rafael Lima/)).toBeInTheDocument();
  });

  it("Alterar prazo exige o motivo", async () => {
    renderizar(); // #41 já tem prazo
    const prazo = await screen.findByRole("region", { name: "Prazo" });
    const anterior = chamado(41).prazoSla;
    fireEvent.click(within(prazo).getByRole("button", { name: "Alterar prazo" }));
    const modal = await screen.findByRole("dialog", { name: "Alterar prazo", hidden: true });
    fireEvent.click(within(modal).getByRole("button", { name: "Em 3 dias úteis", hidden: true }));
    fireEvent.click(within(modal).getByRole("button", { name: "Alterar prazo", hidden: true }));
    expect(await within(modal).findByText("Informe o motivo para continuar.")).toBeInTheDocument();
    expect(chamado(41).prazoSla).toBe(anterior);

    fireEvent.change(within(modal).getByRole("textbox", { hidden: true }), {
      target: { value: "Aguardando a licença do Office" },
    });
    fireEvent.click(within(modal).getByRole("button", { name: "Alterar prazo", hidden: true }));
    await waitFor(() => expect(chamado(41).prazoSla).not.toBe(anterior));
  });

  it("transferido para outro técnico: quem não é o destino só cancela", async () => {
    renderizar(THIAGO, 39); // #39 foi transferido para o Rafael
    await screen.findByRole("region", { name: "Ações" });
    const nomes = () =>
      within(painelAcoes())
        .getAllByRole("button")
        .map((b) => b.getAttribute("aria-label") ?? b.textContent);
    expect(nomes()).toEqual(["Cancelar chamado"]);
  });
});
