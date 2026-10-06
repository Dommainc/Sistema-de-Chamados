"use client";

import { useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import { useDados } from "@/lib/dados/provedor";
import type { AcaoChamado, DadosAcao } from "@/lib/dominio/estados";
import type { Chamado } from "@/lib/dominio/tipos";
import { formatarNumeroChamado } from "@/lib/formato";

const SUCESSO: Record<Exclude<AcaoChamado, "resposta_solicitante">, (numero: string) => string> = {
  assumir: (n) => `Você assumiu o chamado ${n}.`,
  aguardar_usuario: (n) => `Chamado ${n} aguardando o usuário.`,
  retomar: (n) => `Atendimento do chamado ${n} retomado.`,
  transferir: (n) => `Chamado ${n} transferido.`,
  devolver_fila: (n) => `Chamado ${n} devolvido para a fila.`,
  concluir: (n) => `Chamado ${n} concluído.`,
  cancelar: (n) => `Chamado ${n} cancelado.`,
};

/** Executa uma ação da máquina de estados e avisa o resultado (sucesso ou erro do catálogo). */
export function useAcaoChamado() {
  const fonte = useDados();
  const { mostrar, mostrarErro } = useToast();

  return useCallback(
    async (
      chamadoId: number,
      acao: Exclude<AcaoChamado, "resposta_solicitante">,
      dados?: DadosAcao,
    ): Promise<Chamado | null> => {
      try {
        const chamado = await fonte.executarAcao(chamadoId, acao, dados);
        mostrar(SUCESSO[acao](formatarNumeroChamado(chamadoId)), "sucesso");
        return chamado;
      } catch (erro) {
        mostrarErro(erro);
        return null;
      }
    },
    [fonte, mostrar, mostrarErro],
  );
}
