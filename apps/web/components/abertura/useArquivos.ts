"use client";

import { useCallback, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { ehImagem, mimeDoArquivo, nomeDoPrint, validarArquivo } from "@/lib/anexos";
import type { OrigemAnexo } from "@/lib/dominio/tipos";
import { lerArquivosRascunho, salvarArquivosRascunho, type ArquivoSelecionado } from "./rascunho";

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
 * e cria miniaturas. Com `persistir`, guarda no rascunho do "Abrir chamado" para sobreviver ao "Voltar".
 */
export function useArquivosSelecionados({ persistir = true }: { persistir?: boolean } = {}) {
  const { mostrarErro } = useToast();
  const [arquivos, setArquivos] = useState<ArquivoSelecionado[]>(() =>
    persistir ? lerArquivosRascunho() : [],
  );

  const atualizar = useCallback(
    (proximos: ArquivoSelecionado[]) => {
      if (persistir) salvarArquivosRascunho(proximos);
      setArquivos(proximos);
    },
    [persistir],
  );

  const adicionar = useCallback(
    (novos: File[], origem: OrigemAnexo) => {
      const aceitos: ArquivoSelecionado[] = [];
      const nomes = arquivos.map((a) => a.nome);
      const agora = new Date();
      for (const arquivo of novos) {
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
      }
      if (aceitos.length > 0) atualizar([...arquivos, ...aceitos]);
    },
    [arquivos, atualizar, mostrarErro],
  );

  const remover = useCallback(
    (id: string) => {
      const alvo = arquivos.find((a) => a.id === id);
      if (alvo?.previa) URL.revokeObjectURL(alvo.previa);
      atualizar(arquivos.filter((a) => a.id !== id));
    },
    [arquivos, atualizar],
  );

  /** Depois de enviar: esvazia sem revogar as miniaturas (a mensagem otimista ainda as usa). */
  const esvaziar = useCallback(() => atualizar([]), [atualizar]);

  return { arquivos, adicionar, remover, esvaziar };
}
