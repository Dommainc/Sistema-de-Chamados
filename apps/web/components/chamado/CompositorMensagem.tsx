"use client";

import { MessageSquareText, Paperclip, SendHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  rotuloCampo = "Mensagem",
  rotuloEnviar = "Enviar mensagem",
  respostasProntas = [],
}: {
  aoEnviar: (conteudo: string, anexos: ArquivoSelecionado[]) => void;
  placeholder?: string;
  /** Nome acessível do campo e do botão (o Relato técnico usa "Anotação" / "Adicionar ao relato"). */
  rotuloCampo?: string;
  rotuloEnviar?: string;
  /** Respostas prontas (só a TI, no chat): escolher uma coloca o texto no campo — nada é enviado sozinho. */
  respostasProntas?: { titulo: string; texto: string }[];
}) {
  const [texto, setTexto] = useState("");
  const [prontasAbertas, setProntasAbertas] = useState(false);
  const { arquivos, adicionar, remover, esvaziar } = useArquivosSelecionados({ persistir: false });
  const entrada = useRef<HTMLInputElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const menuProntas = useRef<HTMLDivElement>(null);

  // Fecha a lista de respostas prontas ao clicar fora ou apertar Esc.
  useEffect(() => {
    if (!prontasAbertas) return;
    const fora = (e: PointerEvent) => {
      if (!menuProntas.current?.contains(e.target as Node)) setProntasAbertas(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProntasAbertas(false);
    };
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [prontasAbertas]);

  function usarPronta(conteudo: string) {
    // Campo vazio: a resposta entra no lugar; com texto: entra numa linha nova, depois do que já está escrito.
    setTexto((atual) => (atual.trim() ? `${atual.trimEnd()}\n${conteudo}` : conteudo));
    setProntasAbertas(false);
    campo.current?.focus();
  }
  const podeEnviar = texto.trim().length > 0 || arquivos.length > 0;

  function enviar() {
    if (!podeEnviar) return;
    aoEnviar(texto, arquivos);
    setTexto("");
    esvaziar();
  }

  return (
    <div className="flex flex-col gap-2 border-t border-borda bg-superficie px-3 py-3">
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
      {/* relative: a lista de respostas prontas se posiciona pela largura do campo (não passa da tela). */}
      <div className="relative flex items-end gap-2">
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          aria-label="Anexar arquivo"
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-texto-suave hover:bg-fundo"
        >
          <Paperclip aria-hidden="true" className="size-6" />
        </button>
        {respostasProntas.length > 0 ? (
          <div ref={menuProntas} className="shrink-0">
            <button
              type="button"
              onClick={() => setProntasAbertas((v) => !v)}
              aria-label="Respostas prontas"
              aria-expanded={prontasAbertas}
              title="Respostas prontas"
              className="flex size-11 items-center justify-center rounded-full text-texto-suave hover:bg-fundo"
            >
              <MessageSquareText aria-hidden="true" className="size-6" />
            </button>
            {prontasAbertas ? (
              <div className="absolute right-0 bottom-full left-0 z-20 mb-2 flex flex-col sm:right-auto sm:w-96 overflow-hidden rounded-2xl border border-borda bg-superficie shadow-xl">
                <p className="border-b border-borda px-4 py-2 text-xs font-semibold text-texto-suave">
                  Respostas prontas — o texto entra no campo para você revisar
                </p>
                <ul className="max-h-72 overflow-y-auto">
                  {respostasProntas.map((r) => (
                    <li key={r.titulo}>
                      <button
                        type="button"
                        onClick={() => usarPronta(r.texto)}
                        className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left hover:bg-fundo"
                      >
                        <span className="text-sm font-semibold">{r.titulo}</span>
                        <span className="line-clamp-2 text-xs text-texto-suave">{r.texto}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
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
          ref={campo}
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
          aria-label={rotuloCampo}
          placeholder={placeholder}
          className="max-h-40 min-h-11 flex-1 resize-none rounded-3xl border border-borda bg-superficie px-4 py-2.5 text-base [field-sizing:content] placeholder:text-texto-suave"
        />
        <button
          type="button"
          onClick={enviar}
          disabled={!podeEnviar}
          aria-label={rotuloEnviar}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primaria text-sobre-primaria hover:bg-primaria-forte disabled:opacity-50"
        >
          <SendHorizontal aria-hidden="true" className="size-5" />
        </button>
      </div>
    </div>
  );
}
