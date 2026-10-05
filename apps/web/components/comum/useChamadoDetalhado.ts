"use client";

import { useCallback } from "react";
import { useConsulta } from "@/lib/dados/provedor";
import type { FonteDeDados } from "@/lib/dados/tipos";

/** Chamado + nomes (categoria, solicitante, responsável) para as telas de detalhe. */
export function useChamadoDetalhado(id: number) {
  const consultar = useCallback(
    async (fonte: FonteDeDados) => {
      const chamado = await fonte.obterChamado(id);
      const [categorias, perfis] = await Promise.all([
        fonte.listarCategorias(),
        fonte.listarPerfisPublicos(),
      ]);
      return {
        chamado,
        categoria: categorias.find((c) => c.id === chamado.categoriaId) ?? null,
        solicitante: perfis.find((p) => p.id === chamado.solicitanteId) ?? null,
        responsavel: perfis.find((p) => p.id === chamado.responsavelId) ?? null,
      };
    },
    [id],
  );
  return useConsulta(consultar);
}
