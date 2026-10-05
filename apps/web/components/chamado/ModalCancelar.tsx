"use client";

import { useState } from "react";
import { AreaTexto } from "@/components/ui/AreaTexto";
import { Botao } from "@/components/ui/Botao";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useDados } from "@/lib/dados/provedor";
import { ErroApp } from "@/lib/erros/catalogo";
import { formatarNumeroChamado } from "@/lib/formato";

/** Cancelar com motivo obrigatório (CLAUDE.md: solicitante só em Pendente/"Recebido"). */
export function ModalCancelar({
  chamadoId,
  aberto,
  aoFechar,
}: {
  chamadoId: number;
  aberto: boolean;
  aoFechar: () => void;
}) {
  const fonte = useDados();
  const { mostrar, mostrarErro } = useToast();
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);

  async function confirmar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setErro(undefined);
    try {
      await fonte.cancelarChamado(chamadoId, motivo);
      mostrar(`Chamado ${formatarNumeroChamado(chamadoId)} cancelado.`, "sucesso");
      setMotivo("");
      aoFechar();
    } catch (e) {
      if (e instanceof ErroApp && e.codigo === "MOTIVO_OBRIGATORIO") setErro(e.message);
      else {
        mostrarErro(e);
        aoFechar();
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal aberto={aberto} titulo="Cancelar chamado" aoFechar={aoFechar}>
      <form onSubmit={confirmar} noValidate className="flex flex-col gap-4">
        <p className="text-texto-suave">
          O chamado {formatarNumeroChamado(chamadoId)} será encerrado e não poderá ser reaberto.
        </p>
        <AreaTexto
          rotulo="Por que você quer cancelar?"
          required
          rows={3}
          value={motivo}
          erro={erro}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Botao variante="contorno" onClick={aoFechar}>
            Voltar
          </Botao>
          <Botao type="submit" variante="perigoCheio" carregando={enviando}>
            Cancelar chamado
          </Botao>
        </div>
      </form>
    </Modal>
  );
}
