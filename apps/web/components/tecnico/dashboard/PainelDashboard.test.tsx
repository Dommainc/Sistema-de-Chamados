// Dashboard da TI (ADR 0013): números do período, com os dados de exemplo (inclui o histórico #1–#29).

import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProvedorToast } from "@/components/ui/Toast";
import { ProvedorDados } from "@/lib/dados/provedor";
import {
  _reiniciarParaTestes,
  estadoInicial,
  gravarEstado,
} from "@/lib/dados/simulada/armazenamento";
import { criarFonteSimulada } from "@/lib/dados/simulada";
import { USUARIOS_SIMULADOS } from "@/lib/dados/simulada/usuarios";
import { PainelDashboard } from "./PainelDashboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/atendimento/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

const [ANA, , RAFAEL] = USUARIOS_SIMULADOS;

function renderizar(usuario = RAFAEL) {
  return render(
    <ProvedorToast>
      <ProvedorDados usuario={{ id: usuario.id, nome: usuario.nome, papel: usuario.papel }}>
        <PainelDashboard />
      </ProvedorDados>
    </ProvedorToast>,
  );
}

beforeEach(() => {
  localStorage.clear();
  _reiniciarParaTestes();
  gravarEstado(estadoInicial());
});

describe("PainelDashboard", () => {
  it("mostra resumo, volume, equipe e prazo/espera dos últimos 30 dias", async () => {
    renderizar();
    expect(await screen.findByText("Abertos agora")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "30 dias", selected: true })).toBeInTheDocument();
    for (const secao of ["Resumo", "Volume", "Equipe", "Prazo e espera"]) {
      expect(screen.getByRole("region", { name: secao })).toBeInTheDocument();
    }
    const equipe = screen.getByRole("region", { name: "Equipe" });
    expect(within(equipe).getByText("Rafael Lima")).toBeInTheDocument();
    expect(within(equipe).getByText("Thiago Martins")).toBeInTheDocument();
    expect(screen.getByText(/Achei um headset sobrando/)).toBeInTheDocument();
  });

  it("'Escolher datas' mostra os campos De e Até", async () => {
    renderizar();
    await screen.findByText("Abertos agora");
    expect(screen.queryByLabelText("De")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Escolher datas" }));
    expect(screen.getByLabelText("De")).toBeInTheDocument();
    expect(screen.getByLabelText("Até")).toBeInTheDocument();
  });

  it("solicitante não recebe os dados (RLS)", async () => {
    await expect(
      criarFonteSimulada(ANA.id).listarDadosMetricas(
        "2026-01-01T00:00:00Z",
        "2027-01-01T00:00:00Z",
      ),
    ).rejects.toMatchObject({ codigo: "SEM_PERMISSAO" });
  });
});
