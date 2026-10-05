"use client";

import { TelaMensagem } from "@/components/comum/TelaMensagem";
import { useChamadoDetalhado } from "@/components/comum/useChamadoDetalhado";
import { BadgeStatus } from "@/components/ui/BadgeStatus";
import { Card } from "@/components/ui/Card";
import { formatarDataHora, formatarNumeroChamado } from "@/lib/formato";

/** Esqueleto do /atendimento/[id]. Chat, ações e histórico chegam na Entrega 3. */
export function DetalheChamadoTecnico({ id }: { id: number }) {
  const { dados, erro, carregando } = useChamadoDetalhado(id);

  if (carregando) return <p className="text-texto-suave">Carregando...</p>;
  if (erro || !dados) {
    return (
      <TelaMensagem
        titulo="Chamado não encontrado"
        texto={erro?.message ?? ""}
        acao={{ rotulo: "Voltar para a fila", href: "/atendimento" }}
      />
    );
  }

  const { chamado, categoria, solicitante, responsavel } = dados;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <section className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-texto-suave">
          Chamado {formatarNumeroChamado(chamado.id)}
        </p>
        <h1 className="text-2xl font-semibold">{chamado.titulo}</h1>
        <Card className="text-texto-suave">O chat com o solicitante chega na Entrega 3.</Card>
      </section>
      <aside className="flex flex-col gap-3">
        <Card className="flex flex-col gap-2">
          <BadgeStatus status={chamado.status} papel="ti" />
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-texto-suave">Solicitante</dt>
            <dd>
              {solicitante?.nome ?? "—"}
              {solicitante?.departamento ? ` · ${solicitante.departamento}` : ""}
            </dd>
            <dt className="text-texto-suave">Categoria</dt>
            <dd>{categoria?.nome ?? "—"}</dd>
            <dt className="text-texto-suave">Responsável</dt>
            <dd>{responsavel?.nome ?? "—"}</dd>
            <dt className="text-texto-suave">Aberto em</dt>
            <dd>{formatarDataHora(chamado.criadoEm)}</dd>
            <dt className="text-texto-suave">Prazo</dt>
            <dd>{formatarDataHora(chamado.prazoSla)}</dd>
          </dl>
        </Card>
      </aside>
    </div>
  );
}
