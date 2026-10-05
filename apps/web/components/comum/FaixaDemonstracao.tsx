"use client";

import { restaurarExemplos } from "@/lib/dados/simulada/armazenamento";

/** Aviso fixo do modo simulado (ADR 0006), para ninguém confundir com o sistema de verdade. */
export function FaixaDemonstracao() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-alerta-suave px-4 py-1 text-center text-sm text-alerta">
      <span>Modo de demonstração — dados fictícios, salvos só neste navegador.</span>
      <button
        type="button"
        className="min-h-8 underline underline-offset-2"
        onClick={() => {
          if (window.confirm("Apagar as alterações e voltar aos dados de exemplo?")) {
            restaurarExemplos();
            window.location.reload();
          }
        }}
      >
        Restaurar dados de exemplo
      </button>
    </div>
  );
}
