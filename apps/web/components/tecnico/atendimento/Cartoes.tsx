"use client";

import { CalendarClock, Mail, Phone } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { BarraPrazo } from "@/components/ui/BarraPrazo";
import { Botao } from "@/components/ui/Botao";
import type { PerfilPublico, UsuarioSessao } from "@/lib/dados/tipos";
import { acoesDisponiveis } from "@/lib/dominio/estados";
import type { Categoria, Chamado, EventoHistorico, Perfil } from "@/lib/dominio/tipos";
import { formatarDataHora } from "@/lib/formato";
import { situacaoPrazo, textoPrazo } from "@/lib/prazo";
import { textoHistorico } from "@/components/chamado/linhaDoTempo";
import type { AcaoDeBotao } from "../useAcaoChamado";
import type { AcaoComModal } from "./ModalAcao";

/** Cartão branco com título em caixa alta (mockup, tela 7: AÇÕES, PRAZO, SOLICITANTE...). */
export function Secao({
  titulo,
  children,
  className = "",
}: {
  titulo: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={titulo}
      className={`flex flex-col gap-3 rounded-2xl border border-borda bg-superficie p-4 shadow-sm ${className}`}
    >
      <h2 className="text-xs font-semibold tracking-wider text-texto-suave uppercase">{titulo}</h2>
      {children}
    </section>
  );
}

export function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-texto-suave">{rotulo}</span>
      <span className="min-w-0 text-right break-words">{children}</span>
    </div>
  );
}

const COM_MODAL: readonly AcaoDeBotao[] = ["concluir", "transferir", "devolver_fila", "cancelar"];

/**
 * Botões das ações permitidas agora (mesma regra da API: lib/dominio/estados.ts).
 * `compacto` = linha de botões do celular (mockup, tela 9).
 */
export function PainelAcoes({
  chamado,
  usuario,
  compacto = false,
  aoExecutar,
  aoAbrirModal,
}: {
  chamado: Chamado;
  usuario: UsuarioSessao;
  compacto?: boolean;
  aoExecutar: (acao: AcaoDeBotao) => void;
  aoAbrirModal: (acao: AcaoComModal) => void;
}) {
  const acoes = acoesDisponiveis(chamado, usuario);
  if (acoes.length === 0) {
    return <p className="text-sm text-texto-suave">Chamado encerrado: nenhuma ação disponível.</p>;
  }
  const clicar = (acao: AcaoDeBotao) =>
    COM_MODAL.includes(acao) ? aoAbrirModal(acao as AcaoComModal) : aoExecutar(acao);
  const tem = (acao: AcaoDeBotao) => acoes.includes(acao);
  const largura = compacto ? "" : "w-full";

  return (
    <div className={compacto ? "flex flex-wrap gap-2" : "flex flex-col gap-2"}>
      {tem("assumir") ? (
        <Botao className={largura} onClick={() => clicar("assumir")}>
          Assumir
        </Botao>
      ) : null}
      {tem("concluir") ? (
        <Botao variante="sucesso" className={largura} onClick={() => clicar("concluir")}>
          {compacto ? "Concluir" : "Marcar como concluído"}
        </Botao>
      ) : null}
      <div className={compacto ? "contents" : "grid grid-cols-2 gap-2"}>
        {tem("transferir") ? (
          <Botao variante="contorno" onClick={() => clicar("transferir")}>
            Transferir
          </Botao>
        ) : null}
        {tem("aguardar_usuario") ? (
          <Botao variante="contorno" onClick={() => clicar("aguardar_usuario")}>
            Aguardar usuário
          </Botao>
        ) : null}
        {tem("retomar") ? (
          <Botao variante="contorno" onClick={() => clicar("retomar")}>
            {compacto ? "Retomar" : "Retomar atendimento"}
          </Botao>
        ) : null}
        {tem("devolver_fila") ? (
          <Botao variante="contorno" onClick={() => clicar("devolver_fila")}>
            Devolver à fila
          </Botao>
        ) : null}
      </div>
      {tem("cancelar") ? (
        <Botao
          variante="perigo"
          className={compacto ? "" : "self-start px-1"}
          onClick={() => clicar("cancelar")}
        >
          Cancelar chamado
        </Botao>
      ) : null}
    </div>
  );
}

const COR_PREVISAO = {
  vencido: "text-perigo",
  vence_em_breve: "text-alerta",
  no_prazo: "",
  sem_prazo: "text-texto-suave font-normal",
} as const;

/** Cartão PRAZO (ADR 0009): o técnico define ou altera o prazo aqui (`aoDefinirPrazo`). */
export function CartaoPrazo({
  chamado,
  categoria,
  responsavel,
  euId,
  aoDefinirPrazo,
}: {
  chamado: Chamado;
  categoria: Categoria | null;
  responsavel: PerfilPublico | null;
  euId: string;
  /** Ausente em chamado encerrado (prazo não muda mais). */
  aoDefinirPrazo?: () => void;
}) {
  return (
    <Secao titulo="Prazo">
      <Linha rotulo="Previsão">
        <strong className={COR_PREVISAO[situacaoPrazo(chamado.prazoSla)]}>
          {textoPrazo(chamado.prazoSla)}
        </strong>
      </Linha>
      <BarraPrazo criadoEm={chamado.criadoEm} prazo={chamado.prazoSla} semTexto />
      {aoDefinirPrazo ? (
        <Botao variante="contorno" onClick={aoDefinirPrazo} className="min-h-11">
          <CalendarClock aria-hidden="true" className="size-4" />
          {chamado.prazoSla ? "Alterar prazo" : "Definir prazo"}
        </Botao>
      ) : null}
      <Linha rotulo="Responsável">
        {responsavel
          ? `${responsavel.nome}${responsavel.id === euId ? " (você)" : ""}`
          : "Sem responsável"}
      </Linha>
      <Linha rotulo="Categoria">{categoria?.nome ?? "—"}</Linha>
    </Secao>
  );
}

export function CartaoSolicitante({ perfil }: { perfil: Perfil | undefined }) {
  if (!perfil) return null;
  return (
    <Secao titulo="Solicitante">
      <div className="flex items-center gap-3">
        <Avatar nome={perfil.nome} tom="suave" />
        <p className="font-semibold">{perfil.nome}</p>
      </div>
      <Linha rotulo="Departamento">{perfil.departamento ?? "—"}</Linha>
      <Linha rotulo="Telefone">
        {perfil.telefone ? (
          <a
            href={`tel:${perfil.telefone}`}
            className="inline-flex items-center gap-1 text-primaria underline"
          >
            <Phone aria-hidden="true" className="size-3.5" /> {perfil.telefone}
          </a>
        ) : (
          "—"
        )}
      </Linha>
      <Linha rotulo="E-mail">
        <a
          href={`mailto:${perfil.email}`}
          className="inline-flex items-center gap-1 text-primaria underline"
        >
          <Mail aria-hidden="true" className="size-3.5" /> {perfil.email}
        </a>
      </Linha>
    </Secao>
  );
}

export function CartaoHistorico({
  historico,
  perfis,
}: {
  historico: EventoHistorico[];
  perfis: PerfilPublico[];
}) {
  const nome = (id: string | null | undefined) =>
    id ? (perfis.find((p) => p.id === id)?.nome ?? null) : null;
  return (
    <Secao titulo="Histórico">
      <ol className="flex flex-col gap-2">
        {historico.map((h) => (
          <li key={h.id} className="flex justify-between gap-3 text-sm">
            <span className={h.publico ? "" : "text-alerta"}>
              {textoHistorico(h, nome)}
              {h.publico ? null : <span className="sr-only"> (só a TI vê)</span>}
            </span>
            <span className="shrink-0 text-texto-suave">
              {formatarDataHora(h.criadoEm).slice(0, 5)} {formatarDataHora(h.criadoEm).slice(11)}
            </span>
          </li>
        ))}
      </ol>
    </Secao>
  );
}
