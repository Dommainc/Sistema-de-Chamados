"use client";

import { ArrowRightLeft, Lock, NotebookPen } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ArquivoSelecionado } from "@/components/abertura/rascunho";
import { AnexoMiniatura } from "@/components/chamado/AnexoMiniatura";
import { CompositorMensagem } from "@/components/chamado/CompositorMensagem";
import { montarRelato, type ItemRelato } from "@/components/chamado/linhaDoTempo";
import { useToast } from "@/components/ui/Toast";
import { useConsulta, useDados, useUsuario } from "@/lib/dados/provedor";
import type { FonteDeDados } from "@/lib/dados/tipos";
import { estaEncerrado } from "@/lib/dominio/tipos";
import { ErroApp, mensagemErro } from "@/lib/erros/catalogo";

interface Pendente {
  idLocal: number;
  conteudo: string;
  anexos: ArquivoSelecionado[];
  estado: "enviando" | "falhou";
}

const ERROS_DEFINITIVOS = new Set(["TRANSICAO_INVALIDA", "SEM_PERMISSAO", "CAMPO_OBRIGATORIO"]);

let sequenciaLocal = 0;

function Anotacao({ item }: { item: Extract<ItemRelato, { tipo: "anotacao" }> }) {
  return (
    <article className="flex flex-col gap-2 rounded-xl border border-borda border-l-4 border-l-alerta-borda bg-superficie px-4 py-3">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
        <span className="font-semibold">{item.autor}</span>
        <time dateTime={item.criadoEm} className="text-xs text-texto-suave">
          {item.quando}
        </time>
      </header>
      {item.conteudo ? <p className="break-words whitespace-pre-line">{item.conteudo}</p> : null}
      {item.anexos.length > 0 ? (
        <div className="flex flex-col gap-1">
          {item.anexos.map((a) => (
            <AnexoMiniatura key={a.id} anexo={a} minha={false} dentroDoBalao />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function Registro({ item }: { item: Extract<ItemRelato, { tipo: "registro" }> }) {
  return (
    <div className="flex gap-3 px-1 text-sm text-texto-suave">
      <ArrowRightLeft aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <p>
        <span className="font-semibold text-texto">{item.texto}</span>
        {item.motivo ? <> — “{item.motivo}”</> : null}
        <span className="block text-xs">{item.quando}</span>
      </p>
    </div>
  );
}

/**
 * Relato técnico (pedido do dono, 2026-10-06): diário interno do chamado, separado da conversa para não
 * confundir com a resposta ao solicitante. Anotações com autor e data (não se editam nem se apagam),
 * prints com Ctrl+V, e as transferências/devoluções com o motivo. Por baixo são as notas internas
 * (mensagens.interna = true): o solicitante nunca recebe nada daqui (RLS).
 */
export function RelatoTecnico({ chamadoId }: { chamadoId: number }) {
  const fonte = useDados();
  const usuario = useUsuario();
  const { mostrarErro } = useToast();
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const fim = useRef<HTMLDivElement>(null);
  const rolagem = useRef<HTMLDivElement>(null);

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
  const itens = dados ? montarRelato({ ...dados, euId: usuario.id }) : [];

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
          interna: true,
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

  function adicionar(conteudo: string, anexos: ArquivoSelecionado[]) {
    const pendente: Pendente = {
      idLocal: ++sequenciaLocal,
      conteudo: conteudo.trim(),
      anexos,
      estado: "enviando",
    };
    setPendentes((atuais) => [...atuais, pendente]);
    void tentarEnviar(pendente);
  }

  if (erro) return <p className="p-6 text-center text-perigo">{erro.message}</p>;
  if (!dados) return <p className="p-6 text-center text-texto-suave">Carregando relato...</p>;

  const encerrado = estaEncerrado(dados.chamado.status);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="mx-4 mt-3 flex items-center gap-2 rounded-xl bg-alerta-suave px-3 py-2 text-sm text-alerta">
        <Lock aria-hidden="true" className="size-4 shrink-0" />
        Só a TI vê o relato técnico. O solicitante não recebe nada daqui.
      </p>

      <div ref={rolagem} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {itens.length === 0 && pendentes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-texto-suave">
            <NotebookPen aria-hidden="true" className="size-8" />
            <p>Nenhuma anotação ainda.</p>
            <p className="text-sm">
              Registre o que foi verificado e o que foi feito. Ajuda quem pegar o chamado depois.
            </p>
          </div>
        ) : (
          <ol className="flex flex-col gap-3" aria-label="Relato técnico do chamado">
            {itens.map((item) => (
              <li key={item.chave}>
                {item.tipo === "anotacao" ? <Anotacao item={item} /> : <Registro item={item} />}
              </li>
            ))}
            {pendentes.map((p) => (
              <li key={p.idLocal} className="flex flex-col gap-1.5 opacity-70">
                <Anotacao
                  item={{
                    tipo: "anotacao",
                    chave: `p${p.idLocal}`,
                    autor: "Você",
                    minha: true,
                    quando: p.estado === "falhou" ? "não salva" : "Salvando...",
                    conteudo: p.conteudo || "(arquivo)",
                    anexos: [],
                    criadoEm: "",
                  }}
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
        )}
        <div ref={fim} />
      </div>

      <div className="sticky bottom-0">
        {encerrado ? (
          <p className="border-t border-borda bg-superficie px-4 py-4 text-center text-texto-suave">
            Chamado encerrado: o relato fica só para consulta.
          </p>
        ) : (
          <CompositorMensagem
            aoEnviar={adicionar}
            placeholder="Anote o que foi verificado ou feito... (Ctrl+V cola prints)"
            rotuloCampo="Anotação"
            rotuloEnviar="Adicionar ao relato"
          />
        )}
      </div>
    </div>
  );
}
