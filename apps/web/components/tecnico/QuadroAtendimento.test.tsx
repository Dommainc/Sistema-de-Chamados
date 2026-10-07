// Quadro da área técnica (mockup, tela 6). Os testes rodam sem CSS: as três colunas aparecem juntas.

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
import { TIPO_ARRASTE } from "./CartaoChamado";
import { QuadroAtendimento } from "./QuadroAtendimento";
import type { FiltrosQuadro } from "./quadro";

const navegacao = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => navegacao,
  usePathname: () => "/atendimento",
  useSearchParams: () => new URLSearchParams(),
}));

const RAFAEL = USUARIOS_SIMULADOS[2];
const TODOS: FiltrosQuadro = { responsavel: "todos", categoriaId: null, prazo: "todos", busca: "" };

function renderizar(filtros: FiltrosQuadro = TODOS) {
  return render(
    <ProvedorToast>
      <ProvedorDados usuario={{ id: RAFAEL.id, nome: RAFAEL.nome, papel: RAFAEL.papel }}>
        <QuadroAtendimento filtros={filtros} />
      </ProvedorDados>
    </ProvedorToast>,
  );
}

const coluna = (titulo: string) => screen.getByRole("region", { name: new RegExp(`^${titulo}:`) });
const cartao = (numero: number) =>
  screen.getByRole("article", { name: new RegExp(`^Chamado ${numero}:`) });

beforeEach(() => {
  localStorage.clear();
  _reiniciarParaTestes();
  gravarEstado(estadoInicial());
  navegacao.push.mockReset();
});

describe("QuadroAtendimento", () => {
  it("monta Novos, Em atendimento e Aguardando usuário com os exemplos", async () => {
    renderizar();
    await screen.findByText("Próximo da fila");
    expect(within(coluna("Novos")).getByText(/Prazo vencido/)).toBeInTheDocument();
    expect(
      within(coluna("Novos")).getByText("Impressora do 3º andar não imprime"),
    ).toBeInTheDocument();
    expect(
      within(coluna("Em atendimento")).getByText("Instalar AutoCAD no notebook"),
    ).toBeInTheDocument();
    expect(
      within(coluna("Aguardando usuário")).getByText("Outlook não sincroniza"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Transferido para você · por Thiago/)).toBeInTheDocument();
    expect(within(cartao(42)).getByText("NOVO")).toBeInTheDocument();
  });

  it("colunas Concluídos e Cancelados mostram os encerrados recentes, sem botão Assumir", async () => {
    renderizar();
    await screen.findByText("Próximo da fila");
    const concluidos = coluna("Concluídos");
    expect(within(concluidos).getByText("Notebook muito lento")).toBeInTheDocument();
    expect(within(concluidos).getByText("Impressora do RH com papel preso")).toBeInTheDocument();
    expect(within(concluidos).queryByRole("button", { name: "Assumir" })).not.toBeInTheDocument();
    const cancelados = coluna("Cancelados");
    expect(within(cancelados).getByText("Headset novo para reuniões")).toBeInTheDocument();
    expect(within(cancelados).getByText(/Achei um headset sobrando/)).toBeInTheDocument();
  });

  it("arrastar para Cancelados pede o motivo e cancela", async () => {
    renderizar();
    await screen.findByText("Próximo da fila");
    fireEvent.drop(coluna("Cancelados"), {
      dataTransfer: {
        types: [TIPO_ARRASTE],
        getData: () => JSON.stringify({ id: 40, coluna: "novos" }),
      },
    });
    const modal = await screen.findByRole("dialog", { hidden: true });
    const cancelar = () =>
      fireEvent.click(
        within(modal).getByRole("button", { name: "Cancelar chamado", hidden: true }),
      );
    cancelar();
    expect(await within(modal).findByText("Informe o motivo para continuar.")).toBeInTheDocument();
    expect(lerEstado().chamados.find((c) => c.id === 40)?.status).toBe("pendente");
    fireEvent.change(within(modal).getByRole("textbox", { hidden: true }), {
      target: { value: "Senha resetada por telefone" },
    });
    cancelar();
    await waitFor(() =>
      expect(lerEstado().chamados.find((c) => c.id === 40)?.status).toBe("cancelado"),
    );
  });

  it("arrastar para Concluídos pede confirmação e conclui", async () => {
    renderizar();
    await screen.findByText("Próximo da fila");
    fireEvent.drop(coluna("Concluídos"), {
      dataTransfer: {
        types: [TIPO_ARRASTE],
        getData: () => JSON.stringify({ id: 38, coluna: "em_atendimento" }),
      },
    });
    const modal = await screen.findByRole("dialog", { hidden: true });
    expect(lerEstado().chamados.find((c) => c.id === 38)?.status).toBe("em_andamento");
    fireEvent.click(
      within(modal).getByRole("button", { name: "Marcar como concluído", hidden: true }),
    );
    await waitFor(() =>
      expect(
        within(coluna("Concluídos")).getByText("Instalar AutoCAD no notebook"),
      ).toBeInTheDocument(),
    );
    expect(lerEstado().chamados.find((c) => c.id === 38)?.status).toBe("concluido");
  });

  it("Assumir no cartão leva o chamado para Em atendimento", async () => {
    renderizar();
    await screen.findByText("Próximo da fila");
    fireEvent.click(within(cartao(42)).getByRole("button", { name: "Assumir" }));
    await waitFor(() =>
      expect(
        within(coluna("Em atendimento")).getByText("Sem internet na obra Recreio"),
      ).toBeInTheDocument(),
    );
    expect(lerEstado().chamados.find((c) => c.id === 42)?.responsavelId).toBe(RAFAEL.id);
    expect(await screen.findByText("Você assumiu o chamado #42.")).toBeInTheDocument();
  });

  it("Pegar o próximo assume o mais urgente e abre o atendimento", async () => {
    renderizar();
    fireEvent.click(await screen.findByRole("button", { name: /Pegar o próximo/ }));
    await waitFor(() => expect(navegacao.push).toHaveBeenCalledWith("/atendimento/36"));
    expect(lerEstado().chamados.find((c) => c.id === 36)?.status).toBe("em_andamento");
  });

  it("arrastar de Em atendimento para Aguardando usuário muda o status", async () => {
    renderizar();
    await screen.findByText("Próximo da fila");
    fireEvent.drop(coluna("Aguardando usuário"), {
      dataTransfer: {
        types: [TIPO_ARRASTE],
        getData: () => JSON.stringify({ id: 38, coluna: "em_atendimento" }),
      },
    });
    await waitFor(() =>
      expect(
        within(coluna("Aguardando usuário")).getByText("Instalar AutoCAD no notebook"),
      ).toBeInTheDocument(),
    );
  });

  it("movimento que não vale avisa e não muda nada", async () => {
    renderizar();
    await screen.findByText("Próximo da fila");
    fireEvent.drop(coluna("Aguardando usuário"), {
      dataTransfer: {
        types: [TIPO_ARRASTE],
        getData: () => JSON.stringify({ id: 42, coluna: "novos" }),
      },
    });
    expect(
      await screen.findByText("Não é possível mudar de Novos para Aguardando usuário."),
    ).toBeInTheDocument();
    expect(lerEstado().chamados.find((c) => c.id === 42)?.status).toBe("pendente");
  });

  it("filtro 'Só os meus' mostra só o que é do técnico", async () => {
    renderizar({ ...TODOS, responsavel: "meus" });
    await screen.findByText("Próximo da fila");
    expect(screen.queryByText("VPN não conecta em casa")).not.toBeInTheDocument(); // do Thiago
    expect(screen.getByText("Instalar AutoCAD no notebook")).toBeInTheDocument();
  });
});
