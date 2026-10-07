"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useState } from "react";
import { situacaoPrazo } from "@/lib/prazo";
import type { DadosArraste } from "./arraste";
import { COR_STATUS } from "./cores";
import { CartaoChamado, type DadosCartao } from "./CartaoChamado";
import type { ColunaQuadro as IdColuna } from "./quadro";

const LIMITE_INICIAL = 6;

type PropsCartao = {
  dados: DadosCartao;
  euId: string;
  agora: Date;
  destacado: boolean;
  aoAssumir: (id: number) => void;
};

/** Cartão das colunas abertas, arrastável (mouse, dedo e teclado — ver arraste.ts). */
function CartaoArrastavel(props: PropsCartao) {
  const { chamado, coluna } = props.dados;
  const dados: DadosArraste = { chamadoId: chamado.id, coluna };
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: `chamado-${chamado.id}`,
    data: dados,
    // O cartão continua sendo um "article" (busca por cartão e leitores de tela); o dnd-kit põe "button".
    attributes: { role: "article", roleDescription: "cartão arrastável" },
  });
  return (
    <CartaoChamado
      {...props}
      arraste={{
        ref: setNodeRef,
        atributos: attributes,
        ouvintes: listeners,
        arrastando: isDragging,
      }}
    />
  );
}

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
      {cartoes.map((d) => {
        const cartao = {
          dados: d,
          euId: props.euId,
          agora: props.agora,
          destacado: props.destacados.has(d.chamado.id),
          aoAssumir: props.aoAssumir,
        };
        const encerrado = d.coluna === "concluidos" || d.coluna === "cancelados";
        return (
          <li key={d.chamado.id}>
            {encerrado ? <CartaoChamado {...cartao} /> : <CartaoArrastavel {...cartao} />}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Coluna do quadro (mockup, tela 6): uma "raia" com fundo próprio, título com a cor da coluna, contador e
 * cartões. Recebe cartões arrastados (useDroppable; quem decide o que acontece é QuadroAtendimento).
 * `encerrada` = Concluídos/Cancelados (estreita, cartões compactos, só recebem).
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
  className?: string;
}) {
  const [verTodos, setVerTodos] = useState(false);
  const { setNodeRef, isOver: alvo, active } = useDroppable({ id });
  const vindoDeOutra = alvo && (active?.data.current as DadosArraste | undefined)?.coluna !== id;

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
      ref={setNodeRef}
      aria-label={`${titulo}: ${cartoes.length}`}
      className={`flex flex-col gap-3 rounded-2xl border p-2.5 transition-colors ${
        vindoDeOutra
          ? "border-primaria bg-primaria-suave ring-2 ring-primaria"
          : encerrada
            ? "border-transparent bg-superficie-2/50"
            : "border-borda bg-superficie-2/80"
      } ${className}`}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 px-1 pt-0.5">
        <h2 className="flex items-center gap-2 text-base leading-tight font-bold">
          <span
            aria-hidden="true"
            className={`size-2.5 shrink-0 rounded-full ${COR_STATUS[id].bolinha}`}
          />
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
