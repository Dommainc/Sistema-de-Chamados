"use client";

import { TelaMensagem } from "@/components/comum/TelaMensagem";
import { useChamadoDetalhado } from "@/components/comum/useChamadoDetalhado";
import { BadgeStatus } from "@/components/ui/BadgeStatus";
import { Card } from "@/components/ui/Card";
import { estaEncerrado } from "@/lib/dominio/tipos";
import { formatarNumeroChamado, formatarPrevisao } from "@/lib/formato";

/** Esqueleto do /meus-chamados/[id]. Chat, barra de progresso e ações vêm na Entrega 2. */
export function DetalheChamadoSolicitante({ id }: { id: number }) {
  const { dados, erro, carregando } = useChamadoDetalhado(id);

  if (carregando) return <p className="text-texto-suave">Carregando...</p>;
  if (erro || !dados) {
    return (
      <TelaMensagem
        titulo="Sem acesso"
        texto={erro?.message ?? ""}
        acao={{ rotulo: "Ver meus chamados", href: "/meus-chamados" }}
      />
    );
  }

  const { chamado, responsavel } = dados;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-texto-suave">
          Chamado {formatarNumeroChamado(chamado.id)}
        </p>
        <h1 className="text-2xl font-semibold">{chamado.titulo}</h1>
        <div>
          <BadgeStatus status={chamado.status} papel="solicitante" />
        </div>
      </div>
      <Card className="flex flex-col gap-1 text-texto-suave">
        <p>
          Técnico responsável:{" "}
          <span className="text-texto">{responsavel?.nome ?? "ainda não definido"}</span>
        </p>
        {!estaEncerrado(chamado.status) ? (
          <p>
            Previsão de atendimento:{" "}
            <span className="text-texto">até {formatarPrevisao(chamado.prazoSla)}</span>
          </p>
        ) : null}
      </Card>
      <p className="text-sm text-texto-suave">
        A conversa com a TI aparece aqui na próxima entrega.
      </p>
    </div>
  );
}
