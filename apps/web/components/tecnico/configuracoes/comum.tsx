"use client";

// Peças compartilhadas das abas de Configurações (ADR 0022).

import { ArrowDown, ArrowUp } from "lucide-react";
import { useCallback, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { ErroApp, paraErroApp } from "@/lib/erros/catalogo";
import type { CorPaleta } from "@/lib/dominio/tipos";

/** Cartão branco com título em caixa alta (mesmo visual do Dashboard). */
export function Quadro({
  titulo,
  acao,
  children,
  className = "",
}: {
  titulo: string;
  acao?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={titulo}
      className={`flex flex-col gap-3 rounded-2xl border border-borda bg-superficie p-4 shadow-sm ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold tracking-wider text-texto-suave uppercase">
          {titulo}
        </h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

/** Botões ↑ ↓ para mudar a ordem (acessíveis pelo teclado, sem arrastar). */
export function SetasOrdem({
  nome,
  primeiro,
  ultimo,
  aoMover,
  desabilitado = false,
}: {
  nome: string;
  primeiro: boolean;
  ultimo: boolean;
  aoMover: (direcao: -1 | 1) => void;
  desabilitado?: boolean;
}) {
  const classe =
    "inline-flex size-9 items-center justify-center rounded-lg text-texto-suave hover:bg-superficie-2 hover:text-texto disabled:opacity-30";
  return (
    <span className="flex shrink-0">
      <button
        type="button"
        className={classe}
        aria-label={`Subir ${nome}`}
        title="Subir"
        disabled={primeiro || desabilitado}
        onClick={() => aoMover(-1)}
      >
        <ArrowUp aria-hidden="true" className="size-4" />
      </button>
      <button
        type="button"
        className={classe}
        aria-label={`Descer ${nome}`}
        title="Descer"
        disabled={ultimo || desabilitado}
        onClick={() => aoMover(1)}
      >
        <ArrowDown aria-hidden="true" className="size-4" />
      </button>
    </span>
  );
}

/** Troca o item da posição `i` com o vizinho. */
export function mover<T>(lista: readonly T[], i: number, direcao: -1 | 1): T[] {
  const j = i + direcao;
  if (j < 0 || j >= lista.length) return [...lista];
  const nova = [...lista];
  [nova[i], nova[j]] = [nova[j]!, nova[i]!];
  return nova;
}

/**
 * Executa uma gravação mostrando "Salvo" ou o erro do catálogo. Erros com `campos` voltam para a tela
 * marcar o campo (ex.: "opcoes.3" ou "nome").
 */
export function useGravar() {
  const { mostrar, mostrarErro } = useToast();
  const [salvando, setSalvando] = useState(false);
  const [errosCampos, setErrosCampos] = useState<Record<string, string>>({});

  const gravar = useCallback(
    async (acao: () => Promise<void>, sucesso = "Alteração salva."): Promise<boolean> => {
      setSalvando(true);
      setErrosCampos({});
      try {
        await acao();
        mostrar(sucesso, "sucesso");
        return true;
      } catch (e) {
        const erro = paraErroApp(e);
        if (erro instanceof ErroApp && erro.campos.length > 0) {
          setErrosCampos(Object.fromEntries(erro.campos.map((c) => [c.campo, c.mensagem])));
        }
        mostrarErro(erro);
        return false;
      } finally {
        setSalvando(false);
      }
    },
    [mostrar, mostrarErro],
  );

  return { gravar, salvando, errosCampos, limparErros: () => setErrosCampos({}) };
}

const NOMES_COR: Partial<Record<CorPaleta, string>> = {
  "verde-agua": "Verde-água",
  lilas: "Lilás",
  indigo: "Índigo",
};

/** "vermelho-claro" → "Vermelho claro". */
export function nomeDaCor(cor: CorPaleta): string {
  const nome = NOMES_COR[cor] ?? cor.replace(/-/g, " ");
  return nome.charAt(0).toLocaleUpperCase("pt-BR") + nome.slice(1);
}

/** Selo "Desativado" das listas. */
export function SeloDesativado() {
  return (
    <span className="rounded-md bg-superficie-2 px-2 py-0.5 text-xs font-semibold text-texto-suave">
      Desativado
    </span>
  );
}
