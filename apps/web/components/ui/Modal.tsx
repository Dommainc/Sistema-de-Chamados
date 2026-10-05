"use client";

import { useEffect, useRef } from "react";

export interface ModalProps {
  aberto: boolean;
  titulo: string;
  aoFechar: () => void;
  children: React.ReactNode;
}

/** Modal acessível usando <dialog> nativo (foco, Esc e fundo tratados pelo navegador). */
export function Modal({ aberto, titulo, aoFechar, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (aberto && !dialogo.open) dialogo.showModal();
    if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      onClose={aoFechar}
      aria-label={titulo}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-borda bg-superficie p-0 text-texto backdrop:bg-black/40"
    >
      <div className="flex items-center justify-between border-b border-borda px-4 py-3">
        <h2 className="text-lg font-semibold">{titulo}</h2>
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar"
          className="min-h-11 min-w-11 rounded-lg text-2xl leading-none hover:bg-fundo"
        >
          ×
        </button>
      </div>
      <div className="p-4">{children}</div>
    </dialog>
  );
}
