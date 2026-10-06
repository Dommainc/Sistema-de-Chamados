"use client";

import { useState } from "react";
import { AreaTexto } from "@/components/ui/AreaTexto";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useDados } from "@/lib/dados/provedor";
import type { Chamado } from "@/lib/dominio/tipos";
import { ErroApp, mensagemErro } from "@/lib/erros/catalogo";
import { formatarNumeroChamado, formatarPrevisao } from "@/lib/formato";
import { atalhosPrazo, doCampoDataHora, paraCampoDataHora } from "@/lib/prazo";

/**
 * "Definir prazo" / "Alterar prazo" (docs/adr/0009): data e hora em que a TI prevê concluir.
 * Atalhos rápidos; motivo só ao ALTERAR. O solicitante é avisado da previsão (e do motivo).
 */
export function ModalPrazo({
  chamado,
  aberto,
  aoFechar,
}: {
  chamado: Pick<Chamado, "id" | "prazoSla">;
  aberto: boolean;
  aoFechar: () => void;
}) {
  const fonte = useDados();
  const { mostrar, mostrarErro } = useToast();
  const alterando = chamado.prazoSla !== null;
  const [valor, setValor] = useState(() =>
    chamado.prazoSla ? paraCampoDataHora(chamado.prazoSla) : "",
  );
  const [motivo, setMotivo] = useState("");
  const [erros, setErros] = useState<{ prazo?: string; motivo?: string }>({});
  const [enviando, setEnviando] = useState(false);
  const atalhos = atalhosPrazo();

  function fechar() {
    setValor(chamado.prazoSla ? paraCampoDataHora(chamado.prazoSla) : "");
    setMotivo("");
    setErros({});
    aoFechar();
  }

  async function confirmar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const prazo = doCampoDataHora(valor);
    if (!prazo) {
      setErros({ prazo: mensagemErro("CAMPO_OBRIGATORIO", { campo: "Data e hora" }) });
      return;
    }
    setEnviando(true);
    setErros({});
    try {
      await fonte.definirPrazo(chamado.id, prazo, alterando ? motivo : undefined);
      mostrar(
        `Prazo do chamado ${formatarNumeroChamado(chamado.id)}: ${formatarPrevisao(prazo)}.`,
        "sucesso",
      );
      setMotivo("");
      aoFechar();
    } catch (e) {
      if (e instanceof ErroApp && e.codigo === "PRAZO_INVALIDO") setErros({ prazo: e.message });
      else if (e instanceof ErroApp && e.codigo === "MOTIVO_OBRIGATORIO")
        setErros({ motivo: e.message });
      else {
        mostrarErro(e);
        fechar();
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal aberto={aberto} titulo={alterando ? "Alterar prazo" : "Definir prazo"} aoFechar={fechar}>
      <form onSubmit={confirmar} noValidate className="flex flex-col gap-4">
        <p className="text-texto-suave">
          Até quando a TI prevê concluir o chamado {formatarNumeroChamado(chamado.id)}? O
          solicitante vê essa previsão
          {alterando ? " e o motivo da mudança." : "."}
        </p>

        {atalhos.length > 0 ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Atalhos de prazo">
            {atalhos.map((a) => {
              const campo = paraCampoDataHora(a.iso);
              return (
                <button
                  key={a.rotulo}
                  type="button"
                  aria-pressed={valor === campo}
                  onClick={() => setValor(campo)}
                  className={`min-h-10 rounded-full border px-4 text-sm font-semibold ${
                    valor === campo
                      ? "border-primaria bg-primaria-suave text-primaria"
                      : "border-borda bg-superficie hover:bg-fundo"
                  }`}
                >
                  {a.rotulo}
                </button>
              );
            })}
          </div>
        ) : null}

        <Campo
          rotulo="Data e hora"
          type="datetime-local"
          required
          value={valor}
          erro={erros.prazo}
          onChange={(e) => setValor(e.target.value)}
        />

        {alterando ? (
          <AreaTexto
            rotulo="Por que está mudando o prazo?"
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
          <Botao type="submit" carregando={enviando}>
            {alterando ? "Alterar prazo" : "Definir prazo"}
          </Botao>
        </div>
      </form>
    </Modal>
  );
}
