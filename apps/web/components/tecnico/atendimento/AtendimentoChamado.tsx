"use client";

import { Lock } from "lucide-react";
import { useCallback, useState } from "react";
import { ChatChamado } from "@/components/chamado/ChatChamado";
import { AvaliacaoChamado } from "@/components/chamado/AvaliacaoChamado";
import { DetalhesPedido } from "@/components/chamado/DetalhesPedido";
import { TelaMensagem } from "@/components/comum/TelaMensagem";
import { useChamadoDetalhado } from "@/components/comum/useChamadoDetalhado";
import { Segmentado } from "@/components/ui/Segmentado";
import { useToast } from "@/components/ui/Toast";
import { useConsulta, useDados, useUsuario } from "@/lib/dados/provedor";
import type { FonteDeDados } from "@/lib/dados/tipos";
import { tituloErroChamado } from "@/lib/erros/catalogo";
import { naoIniciado, type PrioridadeDaTi } from "@/lib/dominio/tipos";
import { formatarNumeroChamado } from "@/lib/formato";
import { useAcaoChamado } from "../useAcaoChamado";
import { CabecalhoChamado } from "./CabecalhoChamado";
import { Secao } from "./Cartoes";
import { OutrosChamados } from "./OutrosChamados";
import { ModalAcao, type AcaoComModal } from "./ModalAcao";
import { ModalPrazo } from "./ModalPrazo";

type Aba = "conversa" | "detalhes";

/**
 * /atendimento/[id] no layout novo (parte 3, ata de 26/10/2026), página inteira:
 * - topo: "ID 181 · Aberto hoje, 08:42", título, status · prioridade · prazo, ações e os dados do chamado;
 * - esquerda: UMA linha do tempo com a conversa e as notas internas (em âmbar), e as abas
 *   Responder · Nota interna em cima do campo (substitui o "Relato técnico" e o cartão Histórico);
 * - direita: o pedido (respostas do formulário), outros chamados da pessoa e a avaliação.
 * No celular, abas Conversa · Detalhes abaixo do cabeçalho.
 */
export function AtendimentoChamado({ id }: { id: number }) {
  const usuario = useUsuario();
  const fonte = useDados();
  const { mostrar, mostrarErro } = useToast();
  const executar = useAcaoChamado();
  const { dados, erro, carregando } = useChamadoDetalhado(id);
  const [modal, setModal] = useState<AcaoComModal | null>(null);
  const [modalPrazo, setModalPrazo] = useState(false);
  const [aba, setAba] = useState<Aba>("conversa");

  const solicitanteId = dados?.chamado.solicitanteId;
  const consultarExtras = useCallback(
    async (f: FonteDeDados) => {
      const [perfis, solicitante] = await Promise.all([
        f.listarPerfisPublicos(),
        solicitanteId ? f.obterPerfilCompleto(solicitanteId) : Promise.resolve(undefined),
      ]);
      return { solicitante, tecnicos: perfis.filter((p) => p.papel === "ti") };
    },
    [solicitanteId],
  );
  const { dados: extras } = useConsulta(consultarExtras);

  if (carregando) return <p className="text-texto-suave">Carregando...</p>;
  if (erro || !dados) {
    return (
      <TelaMensagem
        titulo={tituloErroChamado(erro)}
        texto={erro?.message ?? ""}
        acao={{ rotulo: "Voltar para o quadro", href: "/atendimento" }}
      />
    );
  }

  const { chamado, categoria, solicitante, responsavel } = dados;
  const primeiroNome = solicitante?.nome.split(" ")[0] ?? "solicitante";

  async function mudarPrioridade(prioridade: PrioridadeDaTi) {
    try {
      await fonte.definirPrioridade(chamado.id, prioridade);
      const nome = { alta: "Alta", media: "Média", baixa: "Baixa" }[prioridade];
      mostrar(`Prioridade do chamado ${formatarNumeroChamado(chamado.id)}: ${nome}.`, "sucesso");
    } catch (e) {
      mostrarErro(e);
    }
  }

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
        aoMudarPrioridade={(p) => void mudarPrioridade(p)}
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
          ]}
        />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Altura fixa da tela: só as mensagens rolam; o campo de escrever fica sempre à vista. */}
        <section
          aria-label="Conversa e notas internas"
          className={`h-[72dvh] min-h-[28rem] flex-col overflow-hidden rounded-2xl border border-borda bg-superficie shadow-sm lg:h-[calc(100dvh-17rem)] lg:min-h-[34rem] ${aba === "conversa" ? "flex" : "hidden lg:flex"}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-borda px-4 py-3">
            <h2 className="font-bold">Conversa com {primeiroNome}</h2>
            <p className="inline-flex items-center gap-1 text-xs text-texto-suave">
              <Lock aria-hidden="true" className="size-3.5 text-alerta" />
              Notas internas em amarelo: só a TI vê
            </p>
          </div>
          <ChatChamado
            chamadoId={chamado.id}
            notasInternas
            placeholder={`Escreva para ${primeiroNome}... (Ctrl+V cola prints)`}
            bloqueio={
              naoIniciado(chamado.status)
                ? `Inicie o chamado para conversar com ${primeiroNome} ou anotar.`
                : undefined
            }
          />
        </section>

        <aside className={`flex-col gap-4 ${aba === "conversa" ? "hidden lg:flex" : "flex"}`}>
          {chamado.status === "concluido" ? (
            <Secao titulo="Avaliação">
              <AvaliacaoChamado chamadoId={chamado.id} modo="ti" />
            </Secao>
          ) : null}
          <Secao titulo="Pedido">
            <DetalhesPedido chamado={chamado} resumo />
          </Secao>
          <OutrosChamados
            chamadoId={chamado.id}
            solicitanteId={chamado.solicitanteId}
            nome={solicitante?.nome ?? "solicitante"}
          />
        </aside>
      </div>

      {modalPrazo ? (
        <ModalPrazo chamado={chamado} aberto aoFechar={() => setModalPrazo(false)} />
      ) : null}
      <ModalAcao
        acao={modal}
        chamadoId={chamado.id}
        responsavelId={chamado.responsavelId}
        // Quem abriu o chamado não recebe por transferência (dono, 2026-10-20).
        tecnicos={(extras?.tecnicos ?? []).filter((t) => t.id !== chamado.solicitanteId)}
        aoFechar={() => setModal(null)}
      />
    </div>
  );
}
