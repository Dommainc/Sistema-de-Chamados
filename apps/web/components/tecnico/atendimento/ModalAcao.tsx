"use client";

import { useId, useState } from "react";
import { AreaTexto } from "@/components/ui/AreaTexto";
import { Botao, type VarianteBotao } from "@/components/ui/Botao";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { PerfilPublico } from "@/lib/dados/tipos";
import { useDados } from "@/lib/dados/provedor";
import { ErroApp } from "@/lib/erros/catalogo";
import { formatarNumeroChamado } from "@/lib/formato";
import { textoSucesso } from "../useAcaoChamado";

export type AcaoComModal = "concluir" | "transferir" | "cancelar";

const CONFIG: Record<
  AcaoComModal,
  {
    titulo: string;
    texto: (n: string) => string;
    botao: string;
    variante: VarianteBotao;
    motivo: string | null;
  }
> = {
  concluir: {
    titulo: "Marcar como concluído",
    texto: (n) =>
      `O chamado ${n} será encerrado e o solicitante será avisado. Ele não poderá ser reaberto: se o problema voltar, o solicitante abre um novo pedido.`,
    botao: "Marcar como concluído",
    variante: "sucesso",
    motivo: null,
  },
  transferir: {
    titulo: "Transferir chamado",
    texto: (n) => `O chamado ${n} vai para o técnico escolhido, que precisa iniciar.`,
    botao: "Transferir",
    variante: "primario",
    motivo: "Por que está transferindo?",
  },
  cancelar: {
    titulo: "Cancelar chamado",
    texto: (n) => `O chamado ${n} será encerrado e não poderá ser reaberto.`,
    botao: "Cancelar chamado",
    variante: "perigoCheio",
    motivo: "Por que o chamado está sendo cancelado?",
  },
};

/** Modais das ações da TI (transferir e cancelar com motivo; concluir só confirma). */
export function ModalAcao({
  acao,
  chamadoId,
  responsavelId,
  tecnicos,
  aoFechar,
}: {
  acao: AcaoComModal | null;
  chamadoId: number;
  responsavelId: string | null;
  tecnicos: PerfilPublico[];
  aoFechar: () => void;
}) {
  const fonte = useDados();
  const { mostrar, mostrarErro } = useToast();
  const idDestino = useId();
  const [destinoId, setDestinoId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [erros, setErros] = useState<{ destino?: string; motivo?: string }>({});
  const [enviando, setEnviando] = useState(false);
  const config = acao ? CONFIG[acao] : null;

  function fechar() {
    setDestinoId("");
    setMotivo("");
    setErros({});
    aoFechar();
  }

  async function confirmar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!acao) return;
    setEnviando(true);
    setErros({});
    try {
      await fonte.executarAcao(chamadoId, acao, {
        motivo: config?.motivo ? motivo : undefined,
        destinoId: acao === "transferir" ? destinoId : undefined,
      });
      mostrar(textoSucesso(acao, chamadoId), "sucesso");
      fechar();
    } catch (e) {
      if (e instanceof ErroApp && e.codigo === "MOTIVO_OBRIGATORIO")
        setErros({ motivo: e.message });
      else if (e instanceof ErroApp && e.codigo === "CAMPO_OBRIGATORIO")
        setErros({ destino: e.message });
      else {
        mostrarErro(e);
        fechar();
      }
    } finally {
      setEnviando(false);
    }
  }

  const opcoes = tecnicos.filter((t) => t.id !== responsavelId);

  return (
    <Modal aberto={acao !== null} titulo={config?.titulo ?? ""} aoFechar={fechar}>
      {config ? (
        <form onSubmit={confirmar} noValidate className="flex flex-col gap-4">
          <p className="text-texto-suave">{config.texto(formatarNumeroChamado(chamadoId))}</p>

          {acao === "transferir" ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={idDestino} className="font-semibold">
                Técnico de destino <span className="text-perigo">*</span>
              </label>
              <select
                id={idDestino}
                value={destinoId}
                onChange={(e) => setDestinoId(e.target.value)}
                aria-invalid={erros.destino ? true : undefined}
                className={`min-h-12 rounded-xl border bg-superficie px-3 ${erros.destino ? "border-perigo" : "border-borda"}`}
              >
                <option value="">Escolha um técnico</option>
                {opcoes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
              {erros.destino ? (
                <p role="alert" className="text-sm font-medium text-perigo">
                  {erros.destino}
                </p>
              ) : null}
            </div>
          ) : null}

          {config.motivo ? (
            <AreaTexto
              rotulo={config.motivo}
              required
              rows={3}
              value={motivo}
              erro={erros.motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Botao variante="contorno" onClick={fechar}>
              Voltar
            </Botao>
            <Botao type="submit" variante={config.variante} carregando={enviando}>
              {config.botao}
            </Botao>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
