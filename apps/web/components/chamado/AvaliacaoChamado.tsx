"use client";

import { useCallback, useState } from "react";
import { AreaTexto } from "@/components/ui/AreaTexto";
import { Botao } from "@/components/ui/Botao";
import { EscolherEstrelas, Estrelas, NOMES_NOTA } from "@/components/ui/Estrelas";
import { useToast } from "@/components/ui/Toast";
import { useConsulta, useDados } from "@/lib/dados/provedor";
import type { FonteDeDados } from "@/lib/dados/tipos";
import { NOTA_EXIGE_TEXTO } from "@/lib/dominio/tipos";
import { ErroApp } from "@/lib/erros/catalogo";
import { formatarDataHora } from "@/lib/formato";

/**
 * Pesquisa de satisfação (ADR 0015).
 * - `solicitante`: no chamado concluído, "Como foi o atendimento?" (estrelas + texto); depois, a nota dada.
 * - `ti`: só leitura — as estrelas, o texto e quem avaliou (ou "ainda não avaliado").
 */
export function AvaliacaoChamado({
  chamadoId,
  modo,
}: {
  chamadoId: number;
  modo: "solicitante" | "ti";
}) {
  const consultar = useCallback(
    async (f: FonteDeDados) => {
      const [avaliacao, perfis] = await Promise.all([
        f.obterAvaliacao(chamadoId),
        modo === "ti" ? f.listarPerfisPublicos() : Promise.resolve([]),
      ]);
      return { avaliacao, perfis };
    },
    [chamadoId, modo],
  );
  const { dados } = useConsulta(consultar);
  if (!dados) return null;
  const { avaliacao } = dados;

  if (avaliacao) {
    const autor = dados.perfis.find((p) => p.id === avaliacao.avaliadorId)?.nome;
    return (
      <section aria-label="Avaliação do atendimento" className="flex flex-col gap-1.5">
        {modo === "solicitante" ? (
          <p className="text-sm font-semibold text-texto-suave">Sua avaliação</p>
        ) : null}
        <p className="flex flex-wrap items-center gap-2">
          <Estrelas nota={avaliacao.nota} tamanho="medio" />
          <span className="font-semibold">{NOMES_NOTA[avaliacao.nota]}</span>
        </p>
        {avaliacao.comentario ? (
          <p className="whitespace-pre-line">“{avaliacao.comentario}”</p>
        ) : null}
        <p className="text-xs text-texto-suave">
          {modo === "ti" && autor ? `${autor} · ` : ""}
          {formatarDataHora(avaliacao.criadoEm)}
        </p>
      </section>
    );
  }

  if (modo === "ti") {
    return <p className="text-sm text-texto-suave">O solicitante ainda não avaliou.</p>;
  }
  return <FormularioAvaliacao chamadoId={chamadoId} />;
}

function FormularioAvaliacao({ chamadoId }: { chamadoId: number }) {
  const fonte = useDados();
  const { mostrar, mostrarErro } = useToast();
  const [nota, setNota] = useState<number | null>(null);
  const [texto, setTexto] = useState("");
  const [erroTexto, setErroTexto] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);
  const exigeTexto = nota !== null && nota <= NOTA_EXIGE_TEXTO;

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (nota === null) return;
    setEnviando(true);
    setErroTexto(undefined);
    try {
      await fonte.avaliarChamado(chamadoId, nota, texto);
      mostrar("Obrigado pela avaliação!", "sucesso");
    } catch (erro) {
      const campo =
        erro instanceof ErroApp ? erro.campos.find((c) => c.campo === "comentario") : null;
      if (campo) setErroTexto(campo.mensagem);
      else mostrarErro(erro);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={enviar}
      noValidate
      aria-label="Avaliar o atendimento"
      className="flex flex-col gap-3 text-left"
    >
      <p className="text-center text-lg font-bold">Como foi o atendimento?</p>
      <EscolherEstrelas valor={nota} aoMudar={setNota} rotulo="Nota do atendimento" />
      {nota !== null ? (
        <>
          <AreaTexto
            rotulo={exigeTexto ? "Conte o que podemos melhorar" : "Quer deixar um comentário?"}
            ajuda={exigeTexto ? undefined : "Opcional."}
            required={exigeTexto}
            rows={3}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            erro={erroTexto}
            maxLength={2000}
          />
          <Botao type="submit" carregando={enviando} larguraTotal>
            Enviar avaliação
          </Botao>
        </>
      ) : null}
    </form>
  );
}
