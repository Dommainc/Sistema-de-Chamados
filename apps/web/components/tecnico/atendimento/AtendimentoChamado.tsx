"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { ChatChamado } from "@/components/chamado/ChatChamado";
import { DetalhesPedido } from "@/components/chamado/DetalhesPedido";
import { contarRelato } from "@/components/chamado/linhaDoTempo";
import { TelaMensagem } from "@/components/comum/TelaMensagem";
import { useChamadoDetalhado } from "@/components/comum/useChamadoDetalhado";
import { BadgeStatus } from "@/components/ui/BadgeStatus";
import { NumeroTicket } from "@/components/ui/NumeroTicket";
import { Segmentado } from "@/components/ui/Segmentado";
import { useConsulta, useUsuario } from "@/lib/dados/provedor";
import type { FonteDeDados } from "@/lib/dados/tipos";
import { formatarNumeroChamado } from "@/lib/formato";
import { situacaoPrazo, textoPrazo } from "@/lib/prazo";
import { useAcaoChamado } from "../useAcaoChamado";
import { CartaoHistorico, CartaoPrazo, CartaoSolicitante, PainelAcoes, Secao } from "./Cartoes";
import { ModalAcao, type AcaoComModal } from "./ModalAcao";
import { RelatoTecnico } from "./RelatoTecnico";

type Aba = "conversa" | "detalhes" | "historico";
type Quadro = "conversa" | "relato";

/**
 * /atendimento/[id] (mockup, telas 7 e 9): à esquerda, abas "Conversa com a Ana" e "Relato técnico"
 * (notas só da TI, separadas da conversa — pedido do dono, 2026-10-06); à direita, ações e dados.
 */
export function AtendimentoChamado({ id }: { id: number }) {
  const usuario = useUsuario();
  const executar = useAcaoChamado();
  const { dados, erro, carregando } = useChamadoDetalhado(id);
  const [quadro, setQuadro] = useState<Quadro>("conversa");
  const [modal, setModal] = useState<AcaoComModal | null>(null);
  const [aba, setAba] = useState<Aba>("conversa");

  const solicitanteId = dados?.chamado.solicitanteId;
  const consultarExtras = useCallback(
    async (f: FonteDeDados) => {
      const [perfis, historico, mensagens, solicitante] = await Promise.all([
        f.listarPerfisPublicos(),
        f.listarHistorico(id),
        f.listarMensagens(id),
        solicitanteId ? f.obterPerfilCompleto(solicitanteId) : Promise.resolve(undefined),
      ]);
      return {
        perfis,
        historico,
        solicitante,
        tecnicos: perfis.filter((p) => p.papel === "ti"),
        itensRelato: contarRelato(mensagens, historico),
      };
    },
    [id, solicitanteId],
  );
  const { dados: extras } = useConsulta(consultarExtras);

  if (carregando) return <p className="text-texto-suave">Carregando...</p>;
  if (erro || !dados) {
    return (
      <TelaMensagem
        titulo="Chamado não encontrado"
        texto={erro?.message ?? ""}
        acao={{ rotulo: "Voltar para o quadro", href: "/atendimento" }}
      />
    );
  }

  const { chamado, categoria, solicitante, responsavel } = dados;
  const primeiroNome = solicitante?.nome.split(" ")[0] ?? "solicitante";
  const agora = new Date();
  const acoesProps = {
    chamado,
    usuario,
    aoExecutar: (acao: Parameters<typeof executar>[1]) => void executar(chamado.id, acao),
    aoAbrirModal: setModal,
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho: faixa escura no celular (mockup, tela 9), simples no computador (tela 7). */}
      <header className="-mx-4 -mt-6 flex flex-col gap-3 bg-barra px-4 pt-3 pb-4 text-sobre-barra lg:mx-0 lg:mt-0 lg:bg-transparent lg:p-0 lg:text-texto">
        <Link
          href="/atendimento"
          className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-semibold lg:text-primaria"
        >
          <ChevronLeft aria-hidden="true" className="size-5 lg:hidden" />
          <span className="hidden lg:inline">←</span> Voltar para o quadro
        </Link>
        <div className="flex items-center gap-3">
          <NumeroTicket
            numero={chamado.id}
            situacao={situacaoPrazo(chamado.prazoSla, agora)}
            className="h-14 rounded-xl lg:hidden"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="hidden font-mono text-2xl font-semibold text-texto-suave lg:inline">
                {formatarNumeroChamado(chamado.id)}
              </span>
              <h1 className="text-xl font-bold lg:text-2xl">{chamado.titulo}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <BadgeStatus status={chamado.status} papel="ti" tamanho="pequeno" />
              <span className="text-sobre-barra-suave lg:hidden">
                Prazo {textoPrazo(chamado.prazoSla, agora).toLowerCase()}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Celular: ações e abas logo abaixo do cabeçalho. */}
      <div className="flex flex-col gap-3 lg:hidden">
        <PainelAcoes {...acoesProps} compacto />
        <Segmentado
          rotuloAcessivel="Partes do chamado"
          larguraTotal
          valor={aba}
          aoMudar={setAba}
          opcoes={[
            { valor: "conversa", rotulo: "Conversa" },
            { valor: "detalhes", rotulo: "Detalhes" },
            { valor: "historico", rotulo: "Histórico" },
          ]}
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section
          aria-label="Conversa e relato técnico"
          className={`min-h-[36rem] flex-col overflow-hidden rounded-2xl border border-borda bg-superficie shadow-sm ${aba === "conversa" ? "flex" : "hidden lg:flex"}`}
        >
          <div className="border-b border-borda px-3 py-3">
            <Segmentado
              rotuloAcessivel="Conversa ou relato técnico"
              larguraTotal
              valor={quadro}
              aoMudar={setQuadro}
              opcoes={[
                { valor: "conversa", rotulo: `Conversa com ${primeiroNome}` },
                {
                  valor: "relato",
                  rotulo: (
                    <span className="inline-flex items-center gap-2">
                      Relato técnico
                      {extras?.itensRelato ? (
                        <span className="rounded-full bg-alerta-suave px-2 text-xs text-alerta">
                          {extras.itensRelato}
                        </span>
                      ) : null}
                    </span>
                  ),
                },
              ]}
            />
          </div>
          {quadro === "conversa" ? (
            <ChatChamado
              chamadoId={chamado.id}
              placeholder={`Escreva para ${primeiroNome}... (Ctrl+V cola prints)`}
            />
          ) : (
            <RelatoTecnico chamadoId={chamado.id} />
          )}
        </section>

        <aside className={`flex-col gap-4 ${aba === "conversa" ? "hidden lg:flex" : "flex"}`}>
          <Secao titulo="Ações" className="hidden lg:flex">
            <PainelAcoes {...acoesProps} />
          </Secao>
          <div className={`flex-col gap-4 ${aba === "historico" ? "hidden lg:flex" : "flex"}`}>
            <CartaoPrazo
              chamado={chamado}
              categoria={categoria}
              responsavel={responsavel}
              euId={usuario.id}
            />
            <CartaoSolicitante perfil={extras?.solicitante} />
            <Secao titulo="Pedido">
              <DetalhesPedido chamado={chamado} />
            </Secao>
          </div>
          {extras ? (
            <div className={aba === "detalhes" ? "hidden lg:block" : ""}>
              <CartaoHistorico historico={extras.historico} perfis={extras.perfis} />
            </div>
          ) : null}
        </aside>
      </div>

      <ModalAcao
        acao={modal}
        chamadoId={chamado.id}
        responsavelId={chamado.responsavelId}
        tecnicos={extras?.tecnicos ?? []}
        aoFechar={() => setModal(null)}
      />
    </div>
  );
}
