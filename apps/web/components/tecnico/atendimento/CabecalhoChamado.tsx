"use client";

import { CalendarClock, ChevronLeft, Lock, Mail, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { BadgeStatus } from "@/components/ui/BadgeStatus";
import { Botao } from "@/components/ui/Botao";
import type { PerfilPublico, UsuarioSessao } from "@/lib/dados/tipos";
import { acoesDisponiveis } from "@/lib/dominio/estados";
import {
  estaEncerrado,
  naoIniciado,
  PRIORIDADES_DA_TI,
  type Categoria,
  type Chamado,
  type Perfil,
  type Prioridade,
  type PrioridadeDaTi,
} from "@/lib/dominio/tipos";
import { formatarDataHora, formatarNumeroChamado } from "@/lib/formato";
import { situacaoPrazo, textoPrazo } from "@/lib/prazo";
import { linkChatTeams } from "@/lib/teams";
import type { AcaoDeBotao } from "../useAcaoChamado";
import type { AcaoComModal } from "./ModalAcao";

const COM_MODAL: readonly AcaoDeBotao[] = ["concluir", "transferir", "cancelar"];

const COR_PRAZO = {
  vencido: "text-perigo",
  vence_em_breve: "text-alerta",
  no_prazo: "text-texto",
  sem_prazo: "text-texto-suave",
} as const;

/** Bloco "rótulo em cima, valor embaixo" da faixa de informações. */
function Info({
  titulo,
  children,
  regiao = false,
  destaque = false,
}: {
  titulo: string;
  children: React.ReactNode;
  /** Ocupa a linha inteira no celular. */
  destaque?: boolean;
  /** Vira uma região nomeada (leitores de tela e testes: "Solicitante", "Prazo"). */
  regiao?: boolean;
}) {
  const Tag = regiao ? "section" : "div";
  return (
    <Tag
      aria-label={regiao ? titulo : undefined}
      className={`flex min-w-0 flex-col gap-1 rounded-xl bg-fundo px-3 py-2.5 ${destaque ? "col-span-2 sm:col-span-1" : ""}`}
    >
      <span className="text-xs font-semibold tracking-wider text-texto-suave uppercase">
        {titulo}
      </span>
      {children}
    </Tag>
  );
}

/**
 * Ações do chamado no cabeçalho (ADR 0014): Iniciar, ou Concluir · Transferir · Cancelar chamado, todas à
 * vista. Sem "Aguardar usuário", "Retomar" e "Devolver à fila": aguardando usuário é só automático.
 */
function AcoesCabecalho({
  chamado,
  usuario,
  aoExecutar,
  aoAbrirModal,
}: {
  chamado: Chamado;
  usuario: UsuarioSessao;
  aoExecutar: (acao: AcaoDeBotao) => void;
  aoAbrirModal: (acao: AcaoComModal) => void;
}) {
  const acoes = acoesDisponiveis(chamado, usuario);
  if (acoes.length === 0) {
    return (
      <section aria-label="Ações">
        <p className="text-sm text-texto-suave">Chamado encerrado: só para consulta.</p>
      </section>
    );
  }
  const tem = (acao: AcaoDeBotao) => acoes.includes(acao);
  const clicar = (acao: AcaoDeBotao) => {
    if (COM_MODAL.includes(acao)) aoAbrirModal(acao as AcaoComModal);
    else aoExecutar(acao);
  };

  return (
    <section
      aria-label="Ações"
      className="flex flex-wrap items-center gap-2 [&_button]:max-sm:min-h-10 [&_button]:max-sm:px-3 [&_button]:max-sm:text-sm"
    >
      {tem("assumir") ? <Botao onClick={() => clicar("assumir")}>Iniciar</Botao> : null}
      {tem("concluir") ? (
        <Botao
          variante="sucesso"
          aria-label="Marcar como concluído"
          onClick={() => clicar("concluir")}
        >
          <span className="sm:hidden">Concluir</span>
          <span className="max-sm:hidden">Marcar como concluído</span>
        </Botao>
      ) : null}
      {tem("transferir") ? (
        <Botao variante="contorno" onClick={() => clicar("transferir")}>
          Transferir
        </Botao>
      ) : null}
      {tem("cancelar") ? (
        <Botao variante="perigo" onClick={() => clicar("cancelar")}>
          Cancelar chamado
        </Botao>
      ) : null}
    </section>
  );
}

const COR_PRIORIDADE: Record<PrioridadeDaTi, { ativa: string; rotulo: string }> = {
  alta: { ativa: "border-perigo bg-perigo text-white", rotulo: "Alta" },
  media: { ativa: "border-amarelo bg-amarelo text-white", rotulo: "Média" },
  baixa: { ativa: "border-apagado bg-apagado text-white", rotulo: "Baixa" },
};

/** Alta (vermelho) · Média (amarelo) · Baixa (cinza) — só a TI vê (ADR 0012). */
function SeletorPrioridade({
  atual,
  desabilitado,
  aoMudar,
}: {
  atual: Prioridade;
  desabilitado: boolean;
  aoMudar: (prioridade: PrioridadeDaTi) => void;
}) {
  return (
    <span className="flex gap-1" role="group" aria-label="Prioridade do chamado">
      {PRIORIDADES_DA_TI.map((p) => {
        const ativa = atual === p;
        return (
          <button
            key={p}
            type="button"
            aria-pressed={ativa}
            disabled={desabilitado}
            onClick={() => aoMudar(p)}
            className={`min-h-8 flex-1 rounded-lg border px-2 text-xs font-bold disabled:cursor-not-allowed ${
              ativa
                ? COR_PRIORIDADE[p].ativa
                : "border-borda bg-superficie text-texto-suave hover:bg-fundo disabled:opacity-50"
            }`}
          >
            {COR_PRIORIDADE[p].rotulo}
          </button>
        );
      })}
    </span>
  );
}

/**
 * Cabeçalho-resumo da tela de atendimento (pedido do dono, 2026-10-07): número, título e status;
 * ações; e a faixa com solicitante (com contato), responsável, prazo (definir/alterar) e categoria.
 * Tudo que o técnico precisa sem rolar a página.
 */
export function CabecalhoChamado({
  chamado,
  categoria,
  solicitante,
  responsavel,
  usuario,
  agora,
  aoExecutar,
  aoAbrirModal,
  aoDefinirPrazo,
  aoMudarPrioridade,
}: {
  chamado: Chamado;
  categoria: Categoria | null;
  solicitante: Perfil | undefined;
  responsavel: PerfilPublico | null;
  usuario: UsuarioSessao;
  agora: Date;
  aoExecutar: (acao: AcaoDeBotao) => void;
  aoAbrirModal: (acao: AcaoComModal) => void;
  aoDefinirPrazo: () => void;
  aoMudarPrioridade: (prioridade: PrioridadeDaTi) => void;
}) {
  const situacao = situacaoPrazo(chamado.prazoSla, agora);
  const encerrado = estaEncerrado(chamado.status);
  // Antes de iniciar: só ver, iniciar ou cancelar (ADR 0012).
  const travado = encerrado || naoIniciado(chamado.status);

  return (
    <header className="flex flex-col gap-4 rounded-2xl border border-borda bg-superficie p-4 shadow-sm lg:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Link
            href="/atendimento"
            className="inline-flex min-h-8 items-center gap-0.5 self-start text-sm font-semibold text-primaria"
          >
            <ChevronLeft aria-hidden="true" className="size-4" /> Quadro
          </Link>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-xl font-semibold text-texto-suave lg:text-2xl">
              {formatarNumeroChamado(chamado.id)}
            </span>
            <h1 className="text-xl font-bold lg:text-2xl">{chamado.titulo}</h1>
            <BadgeStatus status={chamado.status} papel="ti" tamanho="pequeno" />
          </div>
        </div>
        <AcoesCabecalho
          chamado={chamado}
          usuario={usuario}
          aoExecutar={aoExecutar}
          aoAbrirModal={aoAbrirModal}
        />
      </div>

      {/* Celular: solicitante na linha toda; responsável, prazo e categoria em duas colunas. */}
      {naoIniciado(chamado.status) ? (
        <p className="flex items-center gap-2 rounded-xl bg-laranja-suave px-3 py-2.5 text-sm font-semibold text-texto">
          <Lock aria-hidden="true" className="size-4 shrink-0 text-laranja" />
          Chamado ainda não iniciado: você pode ver tudo, mas para conversar, anotar, definir prazo
          ou prioridade, clique em Iniciar.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <Info titulo="Solicitante" regiao destaque>
          {solicitante ? (
            <>
              <span className="flex min-w-0 items-center gap-2">
                <Avatar nome={solicitante.nome} tom="suave" tamanho="pequeno" />
                <span className="truncate font-semibold">{solicitante.nome}</span>
                {solicitante.departamento ? (
                  <span className="truncate text-sm text-texto-suave">
                    · {solicitante.departamento}
                  </span>
                ) : null}
              </span>
              <span className="flex flex-wrap gap-x-3 text-sm">
                {/* Só um link que abre o chat do Teams com a pessoa (sem API — integrações: só login e bot). */}
                <a
                  href={linkChatTeams(solicitante.email)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-primaria underline"
                >
                  <MessageCircle aria-hidden="true" className="size-3.5 shrink-0" /> Falar no Teams
                </a>
                <a
                  href={`mailto:${solicitante.email}`}
                  className="inline-flex min-w-0 items-center gap-1 truncate text-primaria underline"
                >
                  <Mail aria-hidden="true" className="size-3.5 shrink-0" /> {solicitante.email}
                </a>
              </span>
            </>
          ) : (
            <span className="text-texto-suave">Carregando...</span>
          )}
        </Info>

        <Info titulo="Responsável">
          <span className="font-semibold">
            {responsavel
              ? `${responsavel.nome}${responsavel.id === usuario.id ? " (você)" : ""}`
              : "Ninguém ainda"}
          </span>
          <span className="hidden text-sm text-texto-suave sm:inline">
            Aberto em {formatarDataHora(chamado.criadoEm)}
          </span>
        </Info>

        <Info titulo="Prazo" regiao>
          <span className={`font-semibold ${COR_PRAZO[situacao]}`}>
            {textoPrazo(chamado.prazoSla, agora)}
          </span>
          {travado ? null : (
            <button
              type="button"
              onClick={aoDefinirPrazo}
              className="inline-flex items-center gap-1 self-start text-sm font-semibold text-primaria underline underline-offset-2"
            >
              <CalendarClock aria-hidden="true" className="size-4" />
              {chamado.prazoSla ? "Alterar prazo" : "Definir prazo"}
            </button>
          )}
        </Info>

        <Info titulo="Prioridade" regiao>
          <SeletorPrioridade
            atual={chamado.prioridade}
            desabilitado={travado}
            aoMudar={aoMudarPrioridade}
          />
        </Info>

        <Info titulo="Categoria" destaque>
          <span className="font-semibold">{categoria?.nome ?? "—"}</span>
        </Info>
      </div>
    </header>
  );
}
