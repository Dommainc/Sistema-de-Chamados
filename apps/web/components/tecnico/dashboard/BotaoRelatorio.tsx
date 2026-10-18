"use client";

import { FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { ErroApp } from "@/lib/erros/catalogo";
import type { Metricas } from "@/lib/metricas";
import {
  ABAS_STATUS,
  COLUNAS,
  linhasRelatorio,
  linhasResumo,
  nomeDoArquivo,
  type EntradaRelatorio,
  type LinhaRelatorio,
} from "@/lib/relatorio";

/** Cabeçalho em negrito + uma linha por chamado. */
function planilha(linhas: LinhaRelatorio[]) {
  return [
    COLUNAS.map((c) => ({ value: c.titulo, fontWeight: "bold" as const })),
    ...linhas.map((l) =>
      COLUNAS.map((c) => {
        const valor = l[c.chave];
        return valor === null || valor === "" ? null : { value: valor };
      }),
    ),
  ];
}

/**
 * "Baixar relatório" do Dashboard (pedido do gestor): Excel com Resumo, Todos e uma aba por status, do mesmo
 * período da tela. Gerado no navegador (só a TI chega aqui; os dados vêm do RLS, como a tela).
 */
export function BotaoRelatorio({
  entrada,
  metricas,
  de,
  ate,
  periodoTexto,
}: {
  entrada: EntradaRelatorio;
  metricas: Metricas;
  de: string;
  ate: string;
  periodoTexto: string;
}) {
  const { mostrarErro } = useToast();
  const [gerando, setGerando] = useState(false);

  async function baixar() {
    setGerando(true);
    try {
      // A biblioteca do Excel só carrega quando alguém pede o relatório.
      const { default: escreverExcel } = await import("write-excel-file/browser");
      const linhas = linhasRelatorio(entrada);
      const larguras = COLUNAS.map((c) => ({ width: c.largura }));
      const resumo = linhasResumo(metricas, periodoTexto).map(([rotulo, valor]) => [
        { value: rotulo, fontWeight: "bold" as const },
        { value: valor },
      ]);
      await escreverExcel([
        { data: resumo, sheet: "Resumo", columns: [{ width: 38 }, { width: 40 }] },
        { data: planilha(linhas), sheet: "Todos", columns: larguras, stickyRowsCount: 1 },
        ...ABAS_STATUS.map(({ status, aba }) => ({
          data: planilha(linhas.filter((l) => l.status === status)),
          sheet: aba,
          columns: larguras,
          stickyRowsCount: 1,
        })),
      ]).toFile(nomeDoArquivo(de, ate));
    } catch {
      mostrarErro(new ErroApp("ERRO_INESPERADO"));
    } finally {
      setGerando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void baixar()}
      disabled={gerando}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-borda bg-superficie px-4 font-semibold hover:border-primaria disabled:opacity-60"
    >
      <FileSpreadsheet aria-hidden="true" className="size-5 text-sucesso" />
      {gerando ? "Gerando relatório..." : "Baixar relatório (Excel)"}
    </button>
  );
}
