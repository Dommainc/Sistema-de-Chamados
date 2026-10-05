"use client";

import { Camera, FileText, ImageIcon, X } from "lucide-react";
import { useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { ACCEPT_ARQUIVOS, formatarTamanho } from "@/lib/anexos";
import { mensagemErro } from "@/lib/erros/catalogo";
import type { OrigemAnexo } from "@/lib/dominio/tipos";
import type { ArquivoSelecionado } from "./rascunho";
import { imagensColadas } from "./useArquivos";

/**
 * "Fotos e arquivos (opcional)" do mockup (tela 2): botão (abre câmera no celular),
 * arrastar-e-soltar e Ctrl+V. Colar imagem em qualquer lugar do formulário também funciona
 * (tratado no formulário); aqui, colar sem imagem avisa COLAR_SEM_IMAGEM.
 */
export function SeletorAnexos({
  arquivos,
  aoAdicionar,
  aoRemover,
}: {
  arquivos: ArquivoSelecionado[];
  aoAdicionar: (arquivos: File[], origem: OrigemAnexo) => void;
  aoRemover: (id: string) => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const { mostrar } = useToast();
  const [arrastando, setArrastando] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <p className="font-semibold">
        Fotos e arquivos <span className="font-normal text-texto-suave">(opcional)</span>
      </p>

      <div
        role="button"
        tabIndex={0}
        aria-label="Tirar foto ou anexar arquivo. No computador, você também pode colar um print com Ctrl+V."
        onClick={() => entrada.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            entrada.current?.click();
          }
        }}
        onPaste={(e) => {
          e.stopPropagation();
          const imagens = imagensColadas(e.clipboardData);
          e.preventDefault();
          if (imagens.length === 0) {
            mostrar(mensagemErro("COLAR_SEM_IMAGEM"), "erro");
            return;
          }
          aoAdicionar(imagens, "colado");
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          aoAdicionar(Array.from(e.dataTransfer.files), "upload");
        }}
        className={`flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
          arrastando
            ? "border-primaria bg-primaria-suave"
            : "border-borda bg-superficie hover:border-primaria"
        }`}
      >
        <Camera aria-hidden="true" className="size-7 text-primaria" strokeWidth={1.75} />
        <span className="font-semibold text-primaria">Tirar foto ou anexar arquivo</span>
        <span className="text-sm text-texto-suave">No computador: cole um print com Ctrl+V</span>
      </div>
      <input
        ref={entrada}
        type="file"
        multiple
        accept={ACCEPT_ARQUIVOS}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          aoAdicionar(Array.from(e.target.files ?? []), "upload");
          e.target.value = "";
        }}
      />

      {arquivos.length > 0 ? (
        <ul className="flex flex-col gap-2" aria-label="Arquivos que serão enviados">
          {arquivos.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 rounded-2xl border border-borda bg-superficie p-3"
            >
              {a.previa ? (
                // eslint-disable-next-line @next/next/no-img-element -- miniatura local (object URL)
                <img src={a.previa} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-superficie-2 text-texto-suave">
                  {a.mime.startsWith("image/") ? (
                    <ImageIcon aria-hidden="true" className="size-6" />
                  ) : (
                    <FileText aria-hidden="true" className="size-6" />
                  )}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{a.nome}</span>
                <span className="text-sm text-texto-suave">{formatarTamanho(a.tamanho)}</span>
              </span>
              <button
                type="button"
                onClick={() => aoRemover(a.id)}
                aria-label={`Remover ${a.nome}`}
                className="flex size-11 items-center justify-center rounded-xl text-texto-suave hover:bg-fundo hover:text-texto"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
