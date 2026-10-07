"use client";

import { useCallback } from "react";
import { useConsulta } from "@/lib/dados/provedor";
import type { FonteDeDados } from "@/lib/dados/tipos";
import type { Chamado, ValorResposta } from "@/lib/dominio/tipos";
import { formatarDataHora } from "@/lib/formato";
import { AnexoMiniatura } from "./AnexoMiniatura";

function formatarResposta(valor: ValorResposta): string {
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";
  if (Array.isArray(valor)) return valor.join(", ");
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [a, m, d] = valor.split("-");
    return `${d}/${m}/${a}`;
  }
  return String(valor);
}

/**
 * "Ver detalhes do pedido": respostas do formulário, arquivos da abertura e quando foi aberto.
 * `resumo` (tela da TI): só as respostas que NÃO estão na conversa — a descrição e os arquivos já são a
 * 1ª mensagem do chat, e assunto/abertura estão no cabeçalho.
 */
export function DetalhesPedido({
  chamado,
  resumo = false,
}: {
  chamado: Chamado;
  resumo?: boolean;
}) {
  const consultar = useCallback(
    async (f: FonteDeDados) => {
      const [campos, categorias, anexos] = await Promise.all([
        f.listarCamposForm(chamado.categoriaId),
        f.listarCategorias(),
        f.listarAnexos(chamado.id),
      ]);
      return {
        campos,
        categoria: categorias.find((c) => c.id === chamado.categoriaId),
        anexos: anexos.filter((a) => a.mensagemId === null),
      };
    },
    [chamado.categoriaId, chamado.id],
  );
  const { dados } = useConsulta(consultar);
  if (!dados) return null;

  const respostas = dados.campos.filter((c) => chamado.respostasForm[c.chave] !== undefined);
  if (resumo) {
    const extras = respostas.filter((c) => c.chave !== "descricao");
    if (extras.length === 0) {
      return (
        <p className="text-sm text-texto-suave">
          O pedido é só a descrição, que está na primeira mensagem da conversa.
        </p>
      );
    }
    return (
      <dl className="flex flex-col gap-3 text-sm">
        {extras.map((c) => (
          <div key={c.id}>
            <dt className="text-texto-suave">{c.label}</dt>
            <dd className="font-semibold whitespace-pre-line">
              {formatarResposta(chamado.respostasForm[c.chave])}
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-fundo p-4 text-sm">
      <dl className="flex flex-col gap-3">
        <div>
          <dt className="text-texto-suave">Assunto</dt>
          <dd className="font-semibold">{dados.categoria?.nomeCurto ?? "—"}</dd>
        </div>
        {respostas.map((c) => (
          <div key={c.id}>
            <dt className="text-texto-suave">{c.label}</dt>
            <dd className="whitespace-pre-line">
              {formatarResposta(chamado.respostasForm[c.chave])}
            </dd>
          </div>
        ))}
        <div>
          <dt className="text-texto-suave">Aberto em</dt>
          <dd>{formatarDataHora(chamado.criadoEm)}</dd>
        </div>
      </dl>
      {dados.anexos.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-texto-suave">Arquivos enviados</p>
          <div className="flex flex-wrap gap-2">
            {dados.anexos.map((a) => (
              <AnexoMiniatura key={a.id} anexo={a} minha={false} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
