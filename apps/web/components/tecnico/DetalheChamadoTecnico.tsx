"use client";

import Link from "next/link";
import { TelaMensagem } from "@/components/comum/TelaMensagem";
import { useChamadoDetalhado } from "@/components/comum/useChamadoDetalhado";
import { BadgeStatus } from "@/components/ui/BadgeStatus";
import { BarraPrazo } from "@/components/ui/BarraPrazo";
import { Card } from "@/components/ui/Card";
import { useUsuario } from "@/lib/dados/provedor";
import { formatarDataHora, formatarNumeroChamado } from "@/lib/formato";

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold tracking-wider text-texto-suave uppercase">{titulo}</h2>
      {children}
    </Card>
  );
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-texto-suave">{rotulo}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

/**
 * Esqueleto do /atendimento/[id] no visual do mockup (tela 7).
 * Chat com notas internas, ações, contato e histórico chegam na Entrega 3.
 */
export function DetalheChamadoTecnico({ id }: { id: number }) {
  const usuario = useUsuario();
  const { dados, erro, carregando } = useChamadoDetalhado(id);

  if (carregando) return <p className="text-texto-suave">Carregando...</p>;
  if (erro || !dados) {
    return (
      <TelaMensagem
        titulo="Chamado não encontrado"
        texto={erro?.message ?? ""}
        acao={{ rotulo: "Voltar para a lista", href: "/atendimento" }}
      />
    );
  }

  const { chamado, categoria, solicitante, responsavel } = dados;
  return (
    <div className="flex flex-col gap-4">
      <Link href="/atendimento" className="self-start text-sm font-semibold text-primaria">
        ← Voltar para a lista
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-2xl font-semibold text-texto-suave">
          {formatarNumeroChamado(chamado.id)}
        </span>
        <h1 className="text-2xl font-bold">{chamado.titulo}</h1>
        <BadgeStatus status={chamado.status} papel="ti" tamanho="pequeno" />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_22rem]">
        <Card className="flex min-h-80 items-center justify-center text-center text-texto-suave">
          O chat com o solicitante e as notas internas chegam na Entrega 3.
        </Card>
        <aside className="flex flex-col gap-4">
          <Secao titulo="Prazo">
            <BarraPrazo criadoEm={chamado.criadoEm} prazo={chamado.prazoSla} />
            <Linha rotulo="Responsável">
              {responsavel
                ? `${responsavel.nome}${responsavel.id === usuario.id ? " (você)" : ""}`
                : "Sem responsável"}
            </Linha>
            <Linha rotulo="Categoria">{categoria?.nomeCurto ?? "—"}</Linha>
          </Secao>
          <Secao titulo="Solicitante">
            <p className="font-semibold">{solicitante?.nome ?? "—"}</p>
            <Linha rotulo="Departamento">{solicitante?.departamento ?? "—"}</Linha>
          </Secao>
          <Secao titulo="Pedido">
            <p className="text-sm whitespace-pre-line">
              {String(chamado.respostasForm.descricao ?? "—")}
            </p>
            <Linha rotulo="Aberto em">{formatarDataHora(chamado.criadoEm)}</Linha>
          </Secao>
        </aside>
      </div>
    </div>
  );
}
