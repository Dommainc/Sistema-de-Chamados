"use client";

import { CalendarClock, ChevronLeft, Clock, Lock, Mail, MessageCircle } from "lucide-react";
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
import { formatarNumeroChamado, formatarQuando } from "@/lib/formato";
import { situacaoPrazo, textoPrazo, textoPrazoCartao } from "@/lib/prazo";
import { CHAVE_SISTEMA, moduloDe, SEM_SISTEMA } from "@/lib/sistemas";
import { linkChatTeams } from "@/lib/teams";
import { COR_PRIORIDADE } from "../cores";
import type { AcaoDeBotao } from "../useAcaoChamado";
import type { AcaoComModal } from "./ModalAcao";

const COM_MODAL: readonly AcaoDeBotao[] = ["concluir", "transferir", "cancelar"];

const COR_PRAZO = {
  vencido: "text-perigo",
  vence_em_breve: "text-alerta",
  no_prazo: "text-texto",
  sem_prazo: "text-texto-suave",
} as const;

/** Bloco "rótulo em cima, valor embaixo" (layout novo: sem caixa, como no mockup). */
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
      className={`flex min-w-0 flex-col gap-1 ${destaque ? "col-span-2 sm:col-span-1" : ""}`}
    >
      <span className="text-xs text-texto-suave">{titulo}</span>
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

/** Alta · Média · Baixa, com as mesmas cores do quadro (cores.ts) — só a TI vê (ADR 0012). */
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
                ? `border-transparent ${COR_PRIORIDADE[p]?.classe ?? ""}`
                : "border-borda bg-superficie text-texto-suave hover:bg-fundo disabled:opacity-50"
            }`}
          >
            {COR_PRIORIDADE[p]?.rotulo ?? p}
          </button>
        );
      })}
    </span>
  );
}

/** "Aberto hoje, 08:42" · "Aberto ontem, 17:10" · "Aberto em 13/10, 09:00". */
function textoAbertura(iso: string, agora: Date): string {
  const quando = formatarQuando(iso, agora);
  return /^\d/.test(quando) ? `Aberto em ${quando}` : `Aberto ${quando}`;
}

/**
 * Cabeçalho da tela de atendimento no layout novo (parte 3): "ID 181 · Aberto hoje, 08:42", título,
 * status · prioridade · prazo do chamado, as ações e os dados (solicitante com contato, setor, categoria ›
 * sistema, responsável, prazo e prioridade). Tudo que o técnico precisa sem rolar a página.
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
  const prioridade = naoIniciado(chamado.status) ? undefined : COR_PRIORIDADE[chamado.prioridade];
  const prazoCurto = textoPrazoCartao(chamado.prazoSla, agora);
  const sistema = chamado.respostasForm[CHAVE_SISTEMA];
  const caminhoCategoria = [
    categoria?.nome ?? "—",
    typeof sistema === "string" && sistema !== SEM_SISTEMA ? sistema : null,
    moduloDe(chamado.respostasForm),
  ]
    .filter(Boolean)
    .join(" › ");

  return (
    <header className="flex flex-col gap-4 rounded-2xl border border-borda bg-superficie p-4 shadow-sm lg:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Link
            href="/atendimento"
            className="inline-flex min-h-8 items-center gap-0.5 self-start text-sm font-semibold text-texto-suave hover:text-texto"
          >
            <ChevronLeft aria-hidden="true" className="size-4" /> Chamados da TI
          </Link>
          <p className="text-sm text-texto-suave">
            <span className="font-mono font-semibold text-texto">ID {chamado.id}</span>
            <span className="sr-only"> ({formatarNumeroChamado(chamado.id)})</span> ·{" "}
            {textoAbertura(chamado.criadoEm, agora)}
          </p>
          <h1 className="text-xl font-bold lg:text-2xl">{chamado.titulo}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <BadgeStatus status={chamado.status} papel="ti" tamanho="pequeno" />
            {prioridade ? (
              <span className={`rounded px-2 py-0.5 text-xs font-bold ${prioridade.classe}`}>
                {prioridade.rotulo}
              </span>
            ) : null}
            {travado ? null : (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${
                  situacao === "vencido"
                    ? "border-texto font-bold text-texto"
                    : "border-borda text-texto-suave"
                }`}
              >
                <Clock aria-hidden="true" className="size-3.5" />
                Prazo do chamado: {prazoCurto.charAt(0).toLocaleLowerCase("pt-BR")}
                {prazoCurto.slice(1)}
              </span>
            )}
          </div>
          {chamado.continuacaoDe ? (
            <Link
              href={`/atendimento/${chamado.continuacaoDe}`}
              className="self-start text-sm font-semibold text-primaria underline"
            >
              ↻ O problema voltou · continuação do {formatarNumeroChamado(chamado.continuacaoDe)}
            </Link>
          ) : null}
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
          {chamado.solicitanteId === usuario.id
            ? "Este chamado é seu: um colega da TI precisa iniciar o atendimento."
            : "Chamado ainda não iniciado: você pode ver tudo, mas para conversar, anotar, definir prazo ou prioridade, clique em Iniciar."}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-borda pt-4 sm:grid-cols-3 xl:grid-cols-[1.5fr_0.9fr_1fr_1.3fr_1fr_auto]">
        <Info titulo="Solicitante" regiao destaque>
          {solicitante ? (
            <>
              <span className="flex min-w-0 items-center gap-2">
                <Avatar nome={solicitante.nome} tom="suave" tamanho="pequeno" />
                <span className="truncate font-semibold">{solicitante.nome}</span>
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

        <Info titulo="Setor">
          <span className="font-semibold">{solicitante?.departamento || "—"}</span>
        </Info>

        <Info titulo="Categoria">
          <span className="font-semibold">{caminhoCategoria}</span>
        </Info>

        <Info titulo="Responsável">
          {responsavel ? (
            <span className="flex min-w-0 items-center gap-2 font-semibold">
              <Avatar nome={responsavel.nome} tom="suave" tamanho="pequeno" />
              <span className="min-w-0">
                {responsavel.nome}
                {responsavel.id === usuario.id ? " (você)" : ""}
              </span>
            </span>
          ) : (
            <span className="font-semibold text-texto-suave">Ninguém ainda</span>
          )}
        </Info>

        <Info titulo="Prazo do chamado" regiao>
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
      </div>
    </header>
  );
}
