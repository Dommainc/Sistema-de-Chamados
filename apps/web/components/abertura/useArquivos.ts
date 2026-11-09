"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { ehImagem, MAX_POR_ENVIO, mimeDoArquivo, nomeDoPrint, validarArquivo } from "@/lib/anexos";
import { ErroApp } from "@/lib/erros/catalogo";
import type { ArquivoNovo } from "@/lib/dados/tipos";
import type { OrigemAnexo } from "@/lib/dominio/tipos";

export interface ArquivoSelecionado extends ArquivoNovo {
  id: string;
  /** URL temporária (object URL) para a miniatura de imagens. */
  previa: string | null;
}

let sequencia = 0;

/** Imagens da área de transferência (Ctrl+V / Cmd+V). Texto não conta. */
export function imagensColadas(dados: DataTransfer | null): File[] {
  if (!dados) return [];
  const itens = Array.from(dados.items ?? []);
  const deItens = itens
    .filter((i) => i.kind === "file" && i.type.startsWith("image/"))
    .map((i) => i.getAsFile())
    .filter((f): f is File => f !== null);
  if (deItens.length > 0) return deItens;
  return Array.from(dados.files ?? []).filter((f) => f.type.startsWith("image/"));
}

/**
 * Arquivos escolhidos/colados antes de enviar: valida (mesmas mensagens da API), dá nome aos prints
 * e cria miniaturas. Nada fica guardado: saiu da tela, os arquivos somem (pedido do dono, 2026-11-09).
 */
export function useArquivosSelecionados() {
  const { mostrarErro } = useToast();
  const [arquivos, atualizar] = useState<ArquivoSelecionado[]>([]);
  // Miniaturas criadas e ainda não liberadas: ao sair da tela, libera a memória delas.
  const previas = useRef(new Set<string>());

  useEffect(() => {
    const abertas = previas.current;
    return () => {
      for (const url of abertas) URL.revokeObjectURL(url);
      abertas.clear();
    };
  }, []);

  const adicionar = useCallback(
    (novos: File[], origem: OrigemAnexo) => {
      const aceitos: ArquivoSelecionado[] = [];
      const nomes = arquivos.map((a) => a.nome);
      const agora = new Date();
      for (const arquivo of novos) {
        // Até 5 por envio (prints colados contam): o que passar disso fica de fora, com aviso.
        if (arquivos.length + aceitos.length >= MAX_POR_ENVIO) {
          mostrarErro(new ErroApp("ANEXOS_DEMAIS"));
          break;
        }
        const nome = origem === "colado" ? nomeDoPrint(agora, [...nomes]) : arquivo.name;
        const mime = origem === "colado" ? "image/png" : mimeDoArquivo(arquivo.name, arquivo.type);
        try {
          validarArquivo({ tamanho: arquivo.size, mime });
        } catch (erro) {
          mostrarErro(erro);
          continue;
        }
        nomes.push(nome);
        aceitos.push({
          id: `arquivo-${++sequencia}`,
          arquivo,
          nome,
          mime,
          tamanho: arquivo.size,
          origem,
          previa: ehImagem(mime) ? URL.createObjectURL(arquivo) : null,
        });
        const previa = aceitos.at(-1)!.previa;
        if (previa) previas.current.add(previa);
      }
      if (aceitos.length > 0) atualizar([...arquivos, ...aceitos]);
    },
    [arquivos, mostrarErro],
  );

  const remover = useCallback(
    (id: string) => {
      const alvo = arquivos.find((a) => a.id === id);
      if (alvo?.previa) {
        URL.revokeObjectURL(alvo.previa);
        previas.current.delete(alvo.previa);
      }
      atualizar(arquivos.filter((a) => a.id !== id));
    },
    [arquivos],
  );

  /** Depois de enviar: esvazia sem revogar as miniaturas (a mensagem otimista ainda as usa). */
  const esvaziar = useCallback(() => {
    previas.current.clear();
    atualizar([]);
  }, []);

  return { arquivos, adicionar, remover, esvaziar };
}
