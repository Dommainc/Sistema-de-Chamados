"use client";

import { useCallback, useState } from "react";
import { ChatChamado } from "@/components/chamado/ChatChamado";
import { DetalhesPedido } from "@/components/chamado/DetalhesPedido";
import { contarRelato } from "@/components/chamado/linhaDoTempo";
import { TelaMensagem } from "@/components/comum/TelaMensagem";
import { useChamadoDetalhado } from "@/components/comum/useChamadoDetalhado";
import { Segmentado } from "@/components/ui/Segmentado";
import { useConsulta, useUsuario } from "@/lib/dados/provedor";
import type { FonteDeDados } from "@/lib/dados/tipos";
import { useAcaoChamado } from "../useAcaoChamado";
import { CabecalhoChamado } from "./CabecalhoChamado";
import { CartaoHistorico, Secao } from "./Cartoes";
import { ModalAcao, type AcaoComModal } from "./ModalAcao";
import { ModalPrazo } from "./ModalPrazo";
import { RelatoTecnico } from "./RelatoTecnico";

type Aba = "conversa" | "detalhes" | "historico";
type Quadro = "conversa" | "relato";

/**
 * /atendimento/[id] — reorganizada a pedido do dono (2026-10-07):
 * - topo: cabeçalho-resumo com ações, solicitante (contato), responsável, prazo e categoria;
 * - esquerda: "Conversa com a Ana" / "Relato técnico", ocupando a altura da tela;
 * - direita: só o que não está na conversa (respostas do pedido) e o histórico, recolhido.
 * No celular, abas Conversa · Detalhes · Histórico abaixo do cabeçalho.
 */
export function AtendimentoChamado({ id }: { id: number }) {
  const usuario = useUsuario();
  const executar = useAcaoChamado();
  const { dados, erro, carregando } = useChamadoDetalhado(id);
  const [quadro, setQuadro] = useState<Quadro>("conversa");
  const [modal, setModal] = useState<AcaoComModal | null>(null);
  const [modalPrazo, setModalPrazo] = useState(false);
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

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoChamado
        chamado={chamado}
        categoria={categoria}
        solicitante={extras?.solicitante}
        responsavel={responsavel}
        usuario={usuario}
        agora={new Date()}
        aoExecutar={(acao) => void executar(chamado.id, acao)}
        aoAbrirModal={setModal}
        aoDefinirPrazo={() => setModalPrazo(true)}
      />

      {/* Celular: abas logo abaixo do cabeçalho. */}
      <div className="lg:hidden">
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

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Altura fixa da tela: só as mensagens rolam; o campo de escrever fica sempre à vista. */}
        <section
          aria-label="Conversa e relato técnico"
          className={`h-[72dvh] min-h-[28rem] flex-col overflow-hidden rounded-2xl border border-borda bg-superficie shadow-sm lg:h-[calc(100dvh-19rem)] lg:min-h-[34rem] ${aba === "conversa" ? "flex" : "hidden lg:flex"}`}
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
              bloqueio={
                chamado.status === "pendente" || chamado.status === "transferido"
                  ? `Inicie o chamado para conversar com ${primeiroNome}.`
                  : undefined
              }
            />
          ) : (
            <RelatoTecnico chamadoId={chamado.id} />
          )}
        </section>

        <aside className={`flex-col gap-4 ${aba === "conversa" ? "hidden lg:flex" : "flex"}`}>
          <div className={aba === "historico" ? "hidden lg:block" : ""}>
            <Secao titulo="Pedido">
              <DetalhesPedido chamado={chamado} resumo />
            </Secao>
          </div>
          {extras ? (
            <div className={aba === "detalhes" ? "hidden lg:block" : ""}>
              <CartaoHistorico
                historico={extras.historico}
                perfis={extras.perfis}
                abertoNoInicio={aba === "historico"}
              />
            </div>
          ) : null}
        </aside>
      </div>

      {modalPrazo ? (
        <ModalPrazo chamado={chamado} aberto aoFechar={() => setModalPrazo(false)} />
      ) : null}
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
