"use client";

import { FileText, ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { ehImagem, formatarTamanho } from "@/lib/anexos";
import { useDados } from "@/lib/dados/provedor";
import type { Anexo } from "@/lib/dominio/tipos";

/**
 * Anexo dentro da conversa: miniatura (imagem) ou cartão com nome (outros tipos).
 * Clicar abre em tamanho real numa nova aba (URL temporária, como a URL assinada do Storage).
 */
export function AnexoMiniatura({ anexo, minha }: { anexo: Anexo; minha: boolean }) {
  const fonte = useDados();
  const { mostrar, mostrarErro } = useToast();
  const [previa, setPrevia] = useState<string | null>(null);
  const imagem = ehImagem(anexo.mime);

  useEffect(() => {
    if (!imagem) return;
    let ativo = true;
    let url: string | null = null;
    fonte.abrirAnexo(anexo.id).then(
      (u) => {
        url = u;
        if (ativo) setPrevia(u);
      },
      () => undefined,
    );
    return () => {
      ativo = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [anexo.id, fonte, imagem]);

  async function abrir() {
    try {
      const url = await fonte.abrirAnexo(anexo.id);
      if (url) window.open(url, "_blank", "noopener");
      else mostrar("Este arquivo é só um exemplo e não pode ser aberto.", "info");
    } catch (erro) {
      mostrarErro(erro);
    }
  }

  return (
    <button
      type="button"
      onClick={abrir}
      aria-label={`Abrir ${anexo.nome} (${formatarTamanho(anexo.tamanho)})`}
      className={`flex w-56 max-w-full flex-col overflow-hidden rounded-2xl border border-borda bg-superficie-2 text-left ${minha ? "self-end" : "self-start"}`}
    >
      {previa ? (
        // eslint-disable-next-line @next/next/no-img-element -- arquivo local/URL temporária
        <img src={previa} alt="" className="h-36 w-full object-cover" />
      ) : (
        <span className="flex h-28 w-full items-center justify-center gap-2 px-3 text-sm text-texto-suave">
          {imagem ? (
            <ImageIcon aria-hidden="true" className="size-5 shrink-0" />
          ) : (
            <FileText aria-hidden="true" className="size-5 shrink-0" />
          )}
          <span className="break-all">{anexo.nome}</span>
        </span>
      )}
    </button>
  );
}
