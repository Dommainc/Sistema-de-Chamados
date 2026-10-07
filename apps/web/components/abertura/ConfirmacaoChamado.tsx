"use client";

import { Bell, Check, Clock } from "lucide-react";
import Link from "next/link";
import { useCallback } from "react";
import { TelaMensagem } from "@/components/comum/TelaMensagem";
import { BASE_BOTAO, ESTILOS_BOTAO } from "@/components/ui/Botao";
import { Logo } from "@/components/ui/Logo";
import { useConsulta, useUsuario } from "@/lib/dados/provedor";
import type { FonteDeDados } from "@/lib/dados/tipos";
import { formatarNumeroChamado, formatarPrevisao, maiuscula } from "@/lib/formato";
import { caminhosAbertura } from "@/lib/rotas";

/** Passo 3 do "Abrir chamado" (mockup, tela 3). */
export function ConfirmacaoChamado({ id }: { id: number }) {
  const { papel } = useUsuario();
  const caminhos = caminhosAbertura(papel);
  // No portal o passo 3 tem o cabeçalho DOMMA próprio; na área técnica a barra escura já existe.
  const comCabecalho = papel === "solicitante";
  const consultar = useCallback((fonte: FonteDeDados) => fonte.obterChamado(id), [id]);
  const { dados: chamado, erro, carregando } = useConsulta(consultar);

  if (carregando) return <p className="p-6 text-texto-suave">Carregando...</p>;
  if (erro || !chamado) {
    return (
      <TelaMensagem
        titulo="Chamado não encontrado"
        texto={erro?.message ?? ""}
        acao={{ rotulo: "Voltar para o início", href: caminhos.inicio }}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {comCabecalho ? (
        <div className="flex items-center justify-between border-b border-borda bg-superficie px-4 py-3">
          <Logo subtitulo="Central de Chamados" />
          <span className="text-sm font-semibold text-texto-suave">Passo 3 de 3</span>
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-24 items-center justify-center rounded-full bg-sucesso-suave">
            <Check aria-hidden="true" className="size-10 text-sucesso" strokeWidth={2.5} />
          </span>
          <h1 className="text-2xl font-bold">Pronto! Seu chamado é o</h1>
          <p className="font-mono text-6xl font-semibold text-primaria">
            {formatarNumeroChamado(chamado.id)}
          </p>
          <p className="text-lg text-texto-suave">{chamado.titulo}</p>
        </div>

        <div className="flex flex-col rounded-2xl border border-borda bg-superficie">
          <div className="flex gap-3 p-4">
            <Clock aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-primaria" />
            <div>
              <p className="text-sm text-texto-suave">Previsão de conclusão</p>
              <p className="text-lg font-bold">
                {chamado.prazoSla
                  ? maiuscula(formatarPrevisao(chamado.prazoSla))
                  : "A TI vai analisar e informar"}
              </p>
            </div>
          </div>
          <div className="mx-4 border-t border-borda" />
          <div className="flex gap-3 p-4">
            <Bell aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-primaria" />
            <p>
              Você vai receber avisos no <strong>Teams</strong> quando o técnico iniciar o
              atendimento ou responder.
            </p>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <Link
            href={caminhos.acompanhar(chamado.id)}
            className={`${BASE_BOTAO} ${ESTILOS_BOTAO.primario} min-h-13 text-lg`}
          >
            Acompanhar meu chamado
          </Link>
          <Link
            href={caminhos.inicio}
            className={`${BASE_BOTAO} ${ESTILOS_BOTAO.contorno} min-h-13 text-lg`}
          >
            Abrir outro pedido
          </Link>
        </div>
      </div>
    </div>
  );
}
