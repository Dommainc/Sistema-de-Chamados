// Quadro da área técnica (mockup, tela 6). Os testes rodam sem CSS: as três colunas aparecem juntas.

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProvedorToast } from "@/components/ui/Toast";
import { ProvedorDados } from "@/lib/dados/provedor";
import {
  _reiniciarParaTestes,
  estadoInicial,
  gravarEstado,
  lerEstado,
} from "@/lib/dados/simulada/armazenamento";
import { USUARIOS_SIMULADOS } from "@/lib/dados/simulada/usuarios";
import { QuadroAtendimento } from "./QuadroAtendimento";
import type { FiltrosQuadro } from "./quadro";

const navegacao = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => navegacao,
  usePathname: () => "/atendimento",
  useSearchParams: () => new URLSearchParams(),
}));

const RAFAEL = USUARIOS_SIMULADOS[2];
const TODOS: FiltrosQuadro = {
  responsavel: "todos",
  categoriaId: null,
  sistema: null,
  prazo: "todos",
  coluna: null,
  busca: "",
};

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
  simularLayout();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// O jsdom não calcula layout: cada coluna ganha uma posição (lado a lado, 300 px) e cada cartão fica
// dentro da sua coluna — o suficiente para o dnd-kit saber sobre qual coluna o cartão está.
// O "fantasma" (DragOverlay, fora das colunas) começa onde estava o cartão arrastado.
// Ordem das colunas (pedido do dono, 2026-10-08): Transferidos entre Concluídos e Cancelados.
const ORDEM = ["novos", "em_atendimento", "aguardando", "concluidos", "transferidos", "cancelados"];

/** Espera o quadro carregar (a coluna Novos aparece). */
const carregado = () => screen.findByRole("region", { name: /^Novos:/ });
let colunaDeOrigem: number | null = null;
function simularLayout() {
  colunaDeOrigem = null;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const secao = this.closest('section[id^="coluna-"]');
    const i = secao ? ORDEM.indexOf(secao.id.replace("coluna-", "")) : -1;
    if (i < 0) {
      return colunaDeOrigem === null
        ? new DOMRect(0, 0, 0, 0)
        : new DOMRect(colunaDeOrigem * 300 + 10, 50, 260, 120);
    }
    return this === secao
      ? new DOMRect(i * 300, 0, 280, 1000)
      : new DOMRect(i * 300 + 10, 50, 260, 120);
  });
}

const tique = () => act(() => new Promise((r) => setTimeout(r, 10)));

/** Arrasta pelo teclado (o mesmo dnd-kit do mouse e do dedo): espaço pega, → por coluna, espaço solta. */
async function arrastarComTeclado(numero: number, colunasParaDireita: number) {
  const alvo = cartao(numero);
  const secao = alvo.closest('section[id^="coluna-"]');
  colunaDeOrigem = secao ? ORDEM.indexOf(secao.id.replace("coluna-", "")) : null;
  alvo.focus();
  fireEvent.keyDown(alvo, { code: "Space", key: " " });
  await tique();
  for (let i = 0; i < colunasParaDireita; i++) {
    fireEvent.keyDown(document, { code: "ArrowRight", key: "ArrowRight" });
    await tique();
  }
  fireEvent.keyDown(document, { code: "Space", key: " " });
  await tique();
}

describe("QuadroAtendimento", () => {
  it("monta Novos, Em atendimento e Aguardando usuário com os exemplos", async () => {
    renderizar();
    await carregado();
    // Em Novos não há prazo nem prioridade (só depois de iniciar — ADR 0012).
    expect(within(coluna("Novos")).queryByText(/Prazo|Sem prazo|Vence/)).not.toBeInTheDocument();
    expect(within(coluna("Novos")).queryByText(/Prioridade/)).not.toBeInTheDocument();
    expect(
      within(coluna("Novos")).getByText("Impressora do 3º andar não imprime"),
    ).toBeInTheDocument();
    expect(
      within(coluna("Em atendimento")).getByText("Instalar AutoCAD no notebook"),
    ).toBeInTheDocument();
    expect(
      within(coluna("Aguardando usuário")).getByText("Outlook não sincroniza"),
    ).toBeInTheDocument();
    expect(
      within(coluna("Transferidos")).getByText(/Transferido para você · por Thiago/),
    ).toBeInTheDocument();
    expect(within(cartao(42)).getByText("NOVO")).toBeInTheDocument();
  });

  it("sem Próximo da fila, sem legenda de cor do status e sem Iniciar no cartão", async () => {
    renderizar();
    await carregado();
    expect(screen.queryByText("Próximo da fila")).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Cores de status" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("list", { name: "Cores do prazo" }).length).toBeGreaterThan(0);
    expect(within(cartao(42)).queryByRole("button", { name: "Iniciar" })).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("region").map((r) => r.getAttribute("aria-label")?.split(":")[0]),
    ).toEqual([
      "Novos",
      "Em atendimento",
      "Aguardando usuário",
      "Concluídos",
      "Transferidos",
      "Cancelados",
    ]);
  });

  it("cartão mostra a prioridade (alta, média ou baixa) e, em atendimento, só as iniciais", async () => {
    renderizar();
    await carregado();
    expect(within(cartao(38)).getByText(/Prioridade alta/)).toBeInTheDocument();
    expect(within(cartao(33)).getByText("Prioridade média")).toBeInTheDocument();
    expect(within(cartao(42)).queryByText(/Prioridade/)).not.toBeInTheDocument();
    const emAtendimento = cartao(38);
    expect(within(emAtendimento).getByText("RL")).toBeInTheDocument();
    expect(within(emAtendimento).getByText("Com você")).toHaveClass("sr-only");
    // Em Aguardando usuário a bolinha de quem atende também aparece (pedido do dono, 2026-10-08).
    expect(within(cartao(41)).getByText("RL")).toBeInTheDocument();
  });

  it('sistema fica no rodapé do cartão; "Não se aplica" não aparece', async () => {
    renderizar();
    await carregado();
    expect(within(cartao(40)).getByText("Construmanager")).toBeInTheDocument();
    expect(within(cartao(31)).queryByText("Não se aplica")).not.toBeInTheDocument();
  });

  it("filtro por sistema: só os chamados daquele sistema", async () => {
    renderizar({ ...TODOS, sistema: "Construmanager" });
    await carregado();
    expect(cartao(40)).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: /^Chamado 31:/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("article", { name: /^Chamado 36:/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("combobox", { name: "Filtrar por sistema" })[0]).toHaveValue(
      "Construmanager",
    );
  });

  it("colunas Concluídos e Cancelados mostram os encerrados recentes, sem botão Iniciar", async () => {
    renderizar();
    await carregado();
    const concluidos = coluna("Concluídos");
    expect(within(concluidos).getByText("Notebook muito lento")).toBeInTheDocument();
    expect(within(concluidos).getByText("Impressora do RH com papel preso")).toBeInTheDocument();
    expect(within(concluidos).queryByRole("button", { name: "Iniciar" })).not.toBeInTheDocument();
    const cancelados = coluna("Cancelados");
    expect(within(cancelados).getByText("Headset novo para reuniões")).toBeInTheDocument();
    expect(within(cancelados).getByText(/Achei um headset sobrando/)).toBeInTheDocument();
  });

  it("arrastar para Cancelados pede o motivo e cancela", async () => {
    renderizar();
    await carregado();
    await arrastarComTeclado(40, 5); // → Cancelados
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
    await carregado();
    await arrastarComTeclado(38, 2); // → Concluídos
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

  it("arrastar de Novos para Em atendimento inicia o chamado", async () => {
    renderizar();
    await carregado();
    await arrastarComTeclado(42, 1); // → Em atendimento
    await waitFor(() =>
      expect(
        within(coluna("Em atendimento")).getByText("Sem internet na obra Recreio"),
      ).toBeInTheDocument(),
    );
    expect(lerEstado().chamados.find((c) => c.id === 42)?.responsavelId).toBe(RAFAEL.id);
    expect(await screen.findByText("Você iniciou o chamado #42.")).toBeInTheDocument();
  });

  it("aguardando usuário é só automático: arrastar para lá não vale (ADR 0014)", async () => {
    renderizar();
    await carregado();
    await arrastarComTeclado(38, 1); // → Aguardando usuário
    expect(
      await screen.findByText("Não é possível mudar de Em atendimento para Aguardando usuário."),
    ).toBeInTheDocument();
    expect(lerEstado().chamados.find((c) => c.id === 38)?.status).toBe("em_andamento");
  });

  it("movimento que não vale avisa e não muda nada", async () => {
    renderizar();
    await carregado();
    await arrastarComTeclado(42, 2); // → Aguardando usuário
    expect(
      await screen.findByText("Não é possível mudar de Novos para Aguardando usuário."),
    ).toBeInTheDocument();
    expect(lerEstado().chamados.find((c) => c.id === 42)?.status).toBe("pendente");
  });

  it("filtro 'Só os meus' mostra só o que é do técnico", async () => {
    renderizar({ ...TODOS, responsavel: "meus" });
    await carregado();
    expect(screen.queryByText("VPN não conecta em casa")).not.toBeInTheDocument(); // do Thiago
    expect(screen.getByText("Instalar AutoCAD no notebook")).toBeInTheDocument();
  });
});
