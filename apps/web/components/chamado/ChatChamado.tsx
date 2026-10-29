"use client";

import { Lock, RotateCcw, WifiOff } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ArquivoSelecionado } from "@/components/abertura/rascunho";
import { Aviso } from "@/components/ui/Aviso";
import { useToast } from "@/components/ui/Toast";
import { useConsulta, useDados, useUsuario } from "@/lib/dados/provedor";
import type { FonteDeDados } from "@/lib/dados/tipos";
import { estaEncerrado } from "@/lib/dominio/tipos";
import { ErroApp, mensagemErro } from "@/lib/erros/catalogo";
import { preencherNome } from "@/lib/respostas-prontas";
import { caminhosAbertura, comReferente } from "@/lib/rotas";
import { useOnline } from "@/lib/useOnline";
import { AvaliacaoChamado } from "./AvaliacaoChamado";
import { CompositorMensagem } from "./CompositorMensagem";
import { Balao, Conversa } from "./Conversa";
import { montarConversa } from "./linhaDoTempo";

interface Pendente {
  idLocal: number;
  conteudo: string;
  anexos: ArquivoSelecionado[];
  /** Nota interna (só a TI). */
  interna: boolean;
  estado: "enviando" | "falhou";
}

type Modo = "responder" | "nota";

/** Erros em que não adianta tentar de novo: a mensagem sai da tela e o motivo vira aviso. */
const ERROS_DEFINITIVOS = new Set(["TRANSICAO_INVALIDA", "SEM_PERMISSAO", "CAMPO_OBRIGATORIO"]);

let sequenciaLocal = 0;

/**
 * Chat do chamado (mockup, tela 5): conversa em tempo real, envio otimista e,
 * se falhar, "Sua mensagem não foi enviada. Toque para tentar de novo." mantendo o texto.
 * Tela da TI (`notasInternas`): conversa e notas internas juntas (os eventos ficam no Histórico da lateral),
 * com as abas Responder · Nota interna em cima do campo. O solicitante nunca recebe as notas (RLS).
 */
export function ChatChamado({
  chamadoId,
  placeholder = "Escreva sua resposta...",
  bloqueio,
  notasInternas = false,
}: {
  chamadoId: number;
  /** TI: "Escreva para a Ana... (Ctrl+V cola prints)". */
  placeholder?: string;
  /** Texto no lugar do campo de escrever (ex.: TI antes de iniciar o chamado). */
  bloqueio?: string;
  /** Tela de atendimento da TI: mostra as notas internas e a aba "Nota interna". */
  notasInternas?: boolean;
}) {
  const fonte = useDados();
  const usuario = useUsuario();
  const ti = usuario.papel === "ti";
  const { mostrarErro } = useToast();
  const online = useOnline();
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [modo, setModo] = useState<Modo>("responder");
  const fim = useRef<HTMLDivElement>(null);
  const rolagem = useRef<HTMLDivElement>(null);

  const consultar = useCallback(
    async (f: FonteDeDados) => {
      const [chamado, mensagens, historico, anexos, perfis, prontas] = await Promise.all([
        f.obterChamado(chamadoId),
        f.listarMensagens(chamadoId),
        f.listarHistorico(chamadoId),
        f.listarAnexos(chamadoId),
        f.listarPerfisPublicos(),
        // Respostas prontas: só a TI (o solicitante nem consulta).
        ti ? f.listarRespostasProntas() : Promise.resolve([]),
      ]);
      // "Visto" (✓✓): só a TI consulta até quando o solicitante leu.
      const lidoPeloSolicitanteAte = ti
        ? await f.lidoPeloSolicitanteAte(chamadoId, chamado.solicitanteId)
        : null;
      return { chamado, mensagens, historico, anexos, perfis, prontas, lidoPeloSolicitanteAte };
    },
    [chamadoId, ti],
  );
  const { dados, erro } = useConsulta(consultar);

  const itens = dados
    ? montarConversa({
        ...dados,
        euId: usuario.id,
        papel: usuario.papel,
        telaAtendimento: notasInternas,
      })
    : [];
  const totalMensagens = dados?.mensagens.length ?? 0;
  const nomeSolicitante =
    dados?.perfis.find((p) => p.id === dados.chamado.solicitanteId)?.nome.split(" ")[0] ?? "";
  const respostasProntas = (dados?.prontas ?? []).map((r) => ({
    titulo: r.titulo,
    texto: preencherNome(r.texto, nomeSolicitante),
  }));

  // Abrir o chamado (e receber mensagem com ele aberto) marca a conversa como lida.
  useEffect(() => {
    if (dados) fonte.marcarComoLido(chamadoId).catch(() => undefined);
  }, [chamadoId, dados, fonte, totalMensagens]);

  // Mantém a última mensagem visível. Com altura fixa (tela da TI), rola só a área das mensagens;
  // senão (portal do solicitante), rola a página.
  useEffect(() => {
    const area = rolagem.current;
    if (area && area.scrollHeight > area.clientHeight) area.scrollTop = area.scrollHeight;
    else fim.current?.scrollIntoView?.({ block: "end" });
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
      interna: notasInternas && modo === "nota",
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
    <div className="flex min-h-0 flex-1 flex-col">
      {!online ? (
        <Aviso
          tom="perigo"
          icone={WifiOff}
          titulo={mensagemErro("SEM_CONEXAO")}
          className="mx-4 mt-3"
        />
      ) : null}

      <div ref={rolagem} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <Conversa itens={itens} />
        {pendentes.length > 0 ? (
          <ol className="mt-3 flex flex-col gap-3" aria-label="Mensagens sendo enviadas">
            {pendentes.map((p) => (
              <li key={p.idLocal} className="flex flex-col gap-1.5">
                <Balao
                  conteudo={p.conteudo || "(arquivo)"}
                  minha
                  interna={p.interna}
                  hora={p.estado === "falhou" ? "não enviada" : "Enviando..."}
                  esmaecido
                />
                {p.estado === "falhou" ? (
                  <button
                    type="button"
                    onClick={() => void tentarEnviar(p)}
                    className="self-end text-right text-sm font-semibold text-perigo underline underline-offset-2"
                  >
                    {mensagemErro("MENSAGEM_NAO_ENVIADA")}
                  </button>
                ) : null}
              </li>
            ))}
          </ol>
        ) : null}
        <div ref={fim} />
      </div>

      <div className="sticky bottom-0">
        {encerrado ? (
          <div className="flex flex-col items-center gap-1 border-t border-borda bg-superficie px-4 py-4 text-center">
            {dados.chamado.status === "concluido" && dados.chamado.solicitanteId === usuario.id ? (
              <div className="mb-3 w-full max-w-md border-b border-borda pb-4">
                <AvaliacaoChamado chamadoId={dados.chamado.id} modo="solicitante" />
              </div>
            ) : null}
            <p className="font-semibold">Este chamado foi encerrado.</p>
            {dados.chamado.status === "concluido" && dados.chamado.solicitanteId === usuario.id ? (
              // "O problema voltou" (migration 0033): chamado novo do mesmo assunto, já ligado a este.
              <Link
                href={comReferente(
                  caminhosAbertura(usuario.papel).formulario(dados.chamado.categoriaId),
                  dados.chamado.id,
                )}
                className="my-1 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primaria px-4 font-semibold text-sobre-primaria hover:bg-primaria-forte"
              >
                <RotateCcw aria-hidden="true" className="size-4" /> O problema voltou
              </Link>
            ) : null}
            <p className="text-texto-suave">
              Precisa de outra coisa?{" "}
              <Link href={novoPedido} className="font-semibold text-primaria underline">
                Abrir novo chamado
              </Link>
            </p>
          </div>
        ) : bloqueio ? (
          <p className="border-t border-borda bg-fundo px-4 py-4 text-center font-semibold text-texto-suave">
            {bloqueio}
          </p>
        ) : (
          <CompositorMensagem
            aoEnviar={enviar}
            placeholder={
              modo === "nota" ? "Anote o que foi verificado ou feito... (só a TI vê)" : placeholder
            }
            rotuloCampo={modo === "nota" ? "Nota interna" : "Mensagem"}
            rotuloEnviar={modo === "nota" ? "Salvar nota interna" : "Enviar mensagem"}
            respostasProntas={modo === "nota" ? [] : respostasProntas}
            topo={notasInternas ? <AbasEscrever modo={modo} aoMudar={setModo} /> : undefined}
            dica={
              !notasInternas ? undefined : modo === "nota" ? (
                <span className="inline-flex items-center gap-1">
                  <Lock aria-hidden="true" className="size-3.5" /> Só a TI vê. O solicitante não
                  recebe nada.
                </span>
              ) : nomeSolicitante ? (
                `${nomeSolicitante} recebe aviso no Teams`
              ) : undefined
            }
          />
        )}
      </div>
    </div>
  );
}

/** Abas em cima do campo (layout novo): Responder (vai para o solicitante) · Nota interna (só a TI). */
function AbasEscrever({ modo, aoMudar }: { modo: Modo; aoMudar: (modo: Modo) => void }) {
  const aba = (valor: Modo, rotulo: string) => (
    <button
      type="button"
      aria-pressed={modo === valor}
      onClick={() => aoMudar(valor)}
      className={`min-h-9 rounded-lg px-3 text-sm font-semibold ${
        modo === valor ? "bg-superficie-2 text-texto" : "text-texto-suave hover:bg-fundo"
      }`}
    >
      {valor === "nota" ? (
        <Lock aria-hidden="true" className="mr-1 mb-0.5 inline size-3.5" />
      ) : null}
      {rotulo}
    </button>
  );
  return (
    <div role="group" aria-label="Tipo de mensagem" className="flex gap-1">
      {aba("responder", "Responder")}
      {aba("nota", "Nota interna")}
    </div>
  );
}
