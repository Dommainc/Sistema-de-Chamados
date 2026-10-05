"use client";

import { Paperclip, SendHorizontal, X } from "lucide-react";
import { useRef, useState } from "react";
import { imagensColadas, useArquivosSelecionados } from "@/components/abertura/useArquivos";
import type { ArquivoSelecionado } from "@/components/abertura/rascunho";
import { ACCEPT_ARQUIVOS } from "@/lib/anexos";

/**
 * Rodapé do chat (mockup, tela 5): clipe, campo "Escreva sua resposta..." e botão redondo de enviar.
 * Ctrl+V com imagem no campo vira anexo (texto cola normalmente). Enter envia; Shift+Enter quebra linha
 * (no celular, Enter quebra linha e o envio é pelo botão).
 */
export function CompositorMensagem({
  aoEnviar,
  placeholder = "Escreva sua resposta...",
  acima,
}: {
  aoEnviar: (conteudo: string, anexos: ArquivoSelecionado[]) => void;
  placeholder?: string;
  /** Conteúdo acima do campo (ex.: seletor "Responder / Nota interna" da TI). */
  acima?: React.ReactNode;
}) {
  const [texto, setTexto] = useState("");
  const { arquivos, adicionar, remover, esvaziar } = useArquivosSelecionados({ persistir: false });
  const entrada = useRef<HTMLInputElement>(null);
  const podeEnviar = texto.trim().length > 0 || arquivos.length > 0;

  function enviar() {
    if (!podeEnviar) return;
    aoEnviar(texto, arquivos);
    setTexto("");
    esvaziar();
  }

  return (
    <div className="flex flex-col gap-2 border-t border-borda bg-superficie px-3 py-3">
      {acima}
      {arquivos.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Arquivos que serão enviados">
          {arquivos.map((a) => (
            <li
              key={a.id}
              className="flex max-w-full items-center gap-2 rounded-xl border border-borda bg-fundo py-1 pr-1 pl-3 text-sm"
            >
              <span className="truncate">{a.nome}</span>
              <button
                type="button"
                onClick={() => remover(a.id)}
                aria-label={`Remover ${a.nome}`}
                className="flex size-8 items-center justify-center rounded-lg hover:bg-superficie-2"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          aria-label="Anexar arquivo"
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-texto-suave hover:bg-fundo"
        >
          <Paperclip aria-hidden="true" className="size-6" />
        </button>
        <input
          ref={entrada}
          type="file"
          multiple
          accept={ACCEPT_ARQUIVOS}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            adicionar(Array.from(e.target.files ?? []), "upload");
            e.target.value = "";
          }}
        />
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onPaste={(e) => {
            const imagens = imagensColadas(e.clipboardData);
            if (imagens.length === 0) return;
            e.preventDefault();
            adicionar(imagens, "colado");
          }}
          onKeyDown={(e) => {
            const toque = window.matchMedia?.("(pointer: coarse)").matches;
            if (e.key === "Enter" && !e.shiftKey && !toque) {
              e.preventDefault();
              enviar();
            }
          }}
          rows={1}
          aria-label="Mensagem"
          placeholder={placeholder}
          className="max-h-40 min-h-11 flex-1 resize-none rounded-3xl border border-borda bg-superficie px-4 py-2.5 text-base [field-sizing:content] placeholder:text-texto-suave"
        />
        <button
          type="button"
          onClick={enviar}
          disabled={!podeEnviar}
          aria-label="Enviar mensagem"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primaria text-sobre-primaria hover:bg-primaria-forte disabled:opacity-50"
        >
          <SendHorizontal aria-hidden="true" className="size-5" />
        </button>
      </div>
    </div>
  );
}
