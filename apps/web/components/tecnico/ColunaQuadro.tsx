"use client";

import { useState } from "react";
import { situacaoPrazo } from "@/lib/prazo";
import { CartaoChamado, TIPO_ARRASTE, type DadosCartao } from "./CartaoChamado";
import type { ColunaQuadro as IdColuna } from "./quadro";

const LIMITE_INICIAL = 6;

/** Cor que identifica a coluna (bolinha do título). Não tem relação com prazo. */
const COR_COLUNA: Record<IdColuna, string> = {
  novos: "bg-info",
  em_atendimento: "bg-primaria",
  aguardando: "bg-alerta",
  concluidos: "bg-sucesso",
  cancelados: "bg-apagado",
};

function ListaCartoes({
  cartoes,
  ...props
}: {
  cartoes: DadosCartao[];
  euId: string;
  agora: Date;
  destacados: ReadonlySet<number>;
  aoAssumir: (id: number) => void;
}) {
  return (
    <ul className="flex flex-col gap-2.5">
      {cartoes.map((d) => (
        <li key={d.chamado.id}>
          <CartaoChamado
            dados={d}
            euId={props.euId}
            agora={props.agora}
            destacado={props.destacados.has(d.chamado.id)}
            aoAssumir={props.aoAssumir}
          />
        </li>
      ))}
    </ul>
  );
}

/**
 * Coluna do quadro (mockup, tela 6): uma "raia" com fundo próprio, título com a cor da coluna, contador e
 * cartões. Aceita soltar cartões. `encerrada` = Concluídos/Cancelados (estreita, cartões compactos).
 */
export function ColunaQuadro({
  id,
  titulo,
  apoio,
  encerrada = false,
  cartoes,
  euId,
  agora,
  destacados,
  aoAssumir,
  aoSoltar,
  className = "",
}: {
  id: IdColuna;
  titulo: string;
  apoio: string;
  encerrada?: boolean;
  cartoes: DadosCartao[];
  euId: string;
  agora: Date;
  destacados: ReadonlySet<number>;
  aoAssumir: (id: number) => void;
  aoSoltar: (chamadoId: number, de: IdColuna, para: IdColuna) => void;
  className?: string;
}) {
  const [verTodos, setVerTodos] = useState(false);
  const [alvo, setAlvo] = useState(false);

  const visiveis = verTodos ? cartoes : cartoes.slice(0, LIMITE_INICIAL);
  const escondidos = cartoes.length - visiveis.length;
  const props = { euId, agora, destacados, aoAssumir };

  // Em "Novos": seções "PRAZO VENCIDO" e "NA FILA" (mockup).
  const vencidos = visiveis.filter((c) => situacaoPrazo(c.chamado.prazoSla, agora) === "vencido");
  const naFila = visiveis.filter((c) => situacaoPrazo(c.chamado.prazoSla, agora) !== "vencido");
  const totalVencidos = cartoes.filter(
    (c) => situacaoPrazo(c.chamado.prazoSla, agora) === "vencido",
  ).length;

  return (
    <section
      id={`coluna-${id}`}
      aria-label={`${titulo}: ${cartoes.length}`}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(TIPO_ARRASTE)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setAlvo(true);
      }}
      onDragLeave={() => setAlvo(false)}
      onDrop={(e) => {
        setAlvo(false);
        const bruto = e.dataTransfer.getData(TIPO_ARRASTE);
        if (!bruto) return;
        e.preventDefault();
        const { id: chamadoId, coluna } = JSON.parse(bruto) as { id: number; coluna: IdColuna };
        if (coluna !== id) aoSoltar(chamadoId, coluna, id);
      }}
      className={`flex flex-col gap-3 rounded-2xl border p-2.5 transition-colors ${
        alvo
          ? "border-primaria bg-primaria-suave ring-2 ring-primaria"
          : encerrada
            ? "border-transparent bg-superficie-2/50"
            : "border-borda bg-superficie-2/80"
      } ${className}`}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 px-1 pt-0.5">
        <h2 className={`flex items-center gap-2 font-bold ${encerrada ? "text-base" : "text-lg"}`}>
          <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${COR_COLUNA[id]}`} />
          {titulo}
          <span className="rounded-full bg-superficie px-2 text-sm font-semibold text-texto-suave">
            {cartoes.length}
          </span>
        </h2>
        <span className="text-xs text-texto-suave">{apoio}</span>
      </header>

      {cartoes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-borda p-5 text-center text-sm text-texto-suave">
          {encerrada ? "Nada nos últimos 7 dias." : "Nenhum chamado aqui."}
        </p>
      ) : id === "novos" ? (
        <>
          {vencidos.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="px-1 text-xs font-bold tracking-wider text-perigo uppercase">
                Prazo vencido · {totalVencidos}
              </p>
              <ListaCartoes cartoes={vencidos} {...props} />
            </div>
          ) : null}
          {naFila.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="px-1 text-xs font-bold tracking-wider text-texto-suave uppercase">
                Na fila · {cartoes.length - totalVencidos}
              </p>
              <ListaCartoes cartoes={naFila} {...props} />
            </div>
          ) : null}
        </>
      ) : (
        <ListaCartoes cartoes={visiveis} {...props} />
      )}

      {escondidos > 0 ? (
        <button
          type="button"
          onClick={() => setVerTodos(true)}
          className="min-h-11 text-sm font-semibold text-primaria underline underline-offset-2"
        >
          Ver mais {escondidos}
        </button>
      ) : null}
    </section>
  );
}
