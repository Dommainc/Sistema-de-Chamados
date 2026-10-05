"use client";

import { WifiOff } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ArquivoSelecionado } from "@/components/abertura/rascunho";
import { Aviso } from "@/components/ui/Aviso";
import { useToast } from "@/components/ui/Toast";
import { useConsulta, useDados, useUsuario } from "@/lib/dados/provedor";
import type { FonteDeDados } from "@/lib/dados/tipos";
import { estaEncerrado } from "@/lib/dominio/tipos";
import { ErroApp, mensagemErro } from "@/lib/erros/catalogo";
import { caminhosAbertura, comReferente } from "@/lib/rotas";
import { useOnline } from "@/lib/useOnline";
import { CompositorMensagem } from "./CompositorMensagem";
import { Balao, Conversa } from "./Conversa";
import { montarConversa } from "./linhaDoTempo";

interface Pendente {
  idLocal: number;
  conteudo: string;
  anexos: ArquivoSelecionado[];
  interna: boolean;
  estado: "enviando" | "falhou";
}

/** Erros em que não adianta tentar de novo: a mensagem sai da tela e o motivo vira aviso. */
const ERROS_DEFINITIVOS = new Set(["TRANSICAO_INVALIDA", "SEM_PERMISSAO", "CAMPO_OBRIGATORIO"]);

let sequenciaLocal = 0;

/**
 * Chat do chamado (mockup, tela 5): conversa em tempo real, envio otimista e,
 * se falhar, "Sua mensagem não foi enviada. Toque para tentar de novo." mantendo o texto.
 */
export function ChatChamado({
  chamadoId,
  acimaDoCompositor,
  interna = false,
}: {
  chamadoId: number;
  /** Para a TI (Entrega 3): seletor "Responder / Nota interna". */
  acimaDoCompositor?: React.ReactNode;
  /** Envia como nota interna (só TI). */
  interna?: boolean;
}) {
  const fonte = useDados();
  const usuario = useUsuario();
  const { mostrarErro } = useToast();
  const online = useOnline();
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const fim = useRef<HTMLDivElement>(null);

  const consultar = useCallback(
    async (f: FonteDeDados) => {
      const [chamado, mensagens, historico, anexos, perfis] = await Promise.all([
        f.obterChamado(chamadoId),
        f.listarMensagens(chamadoId),
        f.listarHistorico(chamadoId),
        f.listarAnexos(chamadoId),
        f.listarPerfisPublicos(),
      ]);
      return { chamado, mensagens, historico, anexos, perfis };
    },
    [chamadoId],
  );
  const { dados, erro } = useConsulta(consultar);

  const itens = dados ? montarConversa({ ...dados, euId: usuario.id, papel: usuario.papel }) : [];
  const totalMensagens = dados?.mensagens.length ?? 0;

  // Abrir o chamado (e receber mensagem com ele aberto) marca a conversa como lida.
  useEffect(() => {
    if (dados) fonte.marcarComoLido(chamadoId).catch(() => undefined);
  }, [chamadoId, dados, fonte, totalMensagens]);

  // Mantém a última mensagem visível.
  useEffect(() => {
    fim.current?.scrollIntoView?.({ block: "end" });
  }, [itens.length, pendentes.length]);

  const tentarEnviar = useCallback(
    async (pendente: Pendente) => {
      setPendentes((atuais) =>
        atuais.map((p) => (p.idLocal === pendente.idLocal ? { ...p, estado: "enviando" } : p)),
      );
      try {
        await fonte.enviarMensagem({
          chamadoId,
          conteudo: pendente.conteudo,
          interna: pendente.interna,
          anexos: pendente.anexos.map(({ arquivo, nome, mime, tamanho, origem }) => ({
            arquivo,
            nome,
            mime,
            tamanho,
            origem,
          })),
        });
        setPendentes((atuais) => atuais.filter((p) => p.idLocal !== pendente.idLocal));
      } catch (e) {
        if (e instanceof ErroApp && ERROS_DEFINITIVOS.has(e.codigo)) {
          setPendentes((atuais) => atuais.filter((p) => p.idLocal !== pendente.idLocal));
          mostrarErro(e);
          return;
        }
        setPendentes((atuais) =>
          atuais.map((p) => (p.idLocal === pendente.idLocal ? { ...p, estado: "falhou" } : p)),
        );
      }
    },
    [chamadoId, fonte, mostrarErro],
  );

  function enviar(conteudo: string, anexos: ArquivoSelecionado[]) {
    const pendente: Pendente = {
      idLocal: ++sequenciaLocal,
      conteudo: conteudo.trim(),
      anexos,
      interna,
      estado: "enviando",
    };
    setPendentes((atuais) => [...atuais, pendente]);
    void tentarEnviar(pendente);
  }

  if (erro) return <p className="p-6 text-center text-perigo">{erro.message}</p>;
  if (!dados) return <p className="p-6 text-center text-texto-suave">Carregando conversa...</p>;

  const encerrado = estaEncerrado(dados.chamado.status);
  const novoPedido = comReferente(caminhosAbertura(usuario.papel).inicio, dados.chamado.id);

  return (
    <div className="flex flex-1 flex-col">
      {!online ? (
        <Aviso
          tom="perigo"
          icone={WifiOff}
          titulo={mensagemErro("SEM_CONEXAO")}
          className="mx-4 mt-3"
        />
      ) : null}

      <div className="flex-1 px-4 py-4">
        <Conversa itens={itens} />
        {pendentes.length > 0 ? (
          <ol className="mt-3 flex flex-col gap-3" aria-label="Mensagens sendo enviadas">
            {pendentes.map((p) => (
              <li key={p.idLocal} className="flex flex-col gap-1.5">
                <Balao conteudo={p.conteudo || "(arquivo)"} minha interna={p.interna} esmaecido />
                {p.estado === "falhou" ? (
                  <button
                    type="button"
                    onClick={() => void tentarEnviar(p)}
                    className="self-end text-right text-sm font-semibold text-perigo underline underline-offset-2"
                  >
                    {mensagemErro("MENSAGEM_NAO_ENVIADA")}
                  </button>
                ) : (
                  <p className="self-end text-xs text-texto-suave">Enviando...</p>
                )}
              </li>
            ))}
          </ol>
        ) : null}
        <div ref={fim} />
      </div>

      <div className="sticky bottom-0">
        {encerrado ? (
          <div className="flex flex-col items-center gap-1 border-t border-borda bg-superficie px-4 py-4 text-center">
            <p className="font-semibold">Este chamado foi encerrado.</p>
            <p className="text-texto-suave">
              O problema voltou ou precisa de algo?{" "}
              <Link href={novoPedido} className="font-semibold text-primaria underline">
                Abrir novo pedido
              </Link>
            </p>
          </div>
        ) : (
          <CompositorMensagem
            aoEnviar={enviar}
            acima={acimaDoCompositor}
            placeholder={interna ? "Escreva uma nota interna..." : "Escreva sua resposta..."}
          />
        )}
      </div>
    </div>
  );
}
