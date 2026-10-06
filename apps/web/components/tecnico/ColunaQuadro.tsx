"use client";

import { useState } from "react";
import { situacaoPrazo, type SituacaoPrazo } from "@/lib/prazo";
import { CartaoChamado, TIPO_ARRASTE, type DadosCartao } from "./CartaoChamado";
import { proporcaoPrazos, type ColunaQuadro as IdColuna } from "./quadro";

const LIMITE_INICIAL = 6;

const COR_SEGMENTO: Record<SituacaoPrazo, string> = {
  vencido: "bg-perigo",
  vence_em_breve: "bg-laranja",
  no_prazo: "bg-sucesso",
  sem_prazo: "bg-borda",
};

/** Barra fina no topo da coluna: proporção de vencidos, vencendo e no prazo. */
function BarraProporcao({ cartoes, agora }: { cartoes: DadosCartao[]; agora: Date }) {
  const contagem = proporcaoPrazos(
    cartoes.map((c) => c.chamado),
    agora,
  );
  const total = cartoes.length;
  return (
    <div className="flex h-1.5 overflow-hidden rounded-full bg-superficie-2" aria-hidden="true">
      {total > 0
        ? (Object.keys(COR_SEGMENTO) as SituacaoPrazo[]).map((s) =>
            contagem[s] > 0 ? (
              <span
                key={s}
                className={COR_SEGMENTO[s]}
                style={{ width: `${(contagem[s] / total) * 100}%` }}
              />
            ) : null,
          )
        : null}
    </div>
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
    <ul className="flex flex-col gap-3">
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

/** Coluna do quadro (mockup, tela 6): título, contador, barra de prazos e cartões. Aceita soltar cartões. */
export function ColunaQuadro({
  id,
  titulo,
  apoio,
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
      className={`flex flex-col gap-3 rounded-2xl p-1 transition-colors ${alvo ? "bg-primaria-suave ring-2 ring-primaria" : ""} ${className}`}
    >
      <header className="flex flex-col gap-2 px-1">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold">
            {titulo} <span className="font-semibold text-texto-suave">{cartoes.length}</span>
          </h2>
          <span className="text-xs text-texto-suave">{apoio}</span>
        </div>
        {id === "concluidos" ? (
          <div className="h-1.5 rounded-full bg-sucesso" aria-hidden="true" />
        ) : (
          <BarraProporcao cartoes={cartoes} agora={agora} />
        )}
      </header>

      {cartoes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-borda p-6 text-center text-sm text-texto-suave">
          Nenhum chamado aqui.
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
