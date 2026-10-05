"use client";

// Avisos rápidos (toasts) para erros e confirmações de ação.

import { createContext, useCallback, useContext, useState } from "react";
import { paraErroApp } from "@/lib/erros/catalogo";

type TipoToast = "erro" | "sucesso" | "info";

interface Toast {
  id: number;
  tipo: TipoToast;
  texto: string;
}

interface ContextoToast {
  mostrar: (texto: string, tipo?: TipoToast) => void;
  /** Mostra qualquer erro sempre pela mensagem do catálogo. */
  mostrarErro: (erro: unknown) => void;
}

const Contexto = createContext<ContextoToast | null>(null);

const ESTILOS: Record<TipoToast, string> = {
  erro: "border-perigo bg-perigo-suave text-perigo",
  sucesso: "border-sucesso bg-sucesso-suave text-sucesso",
  info: "border-info bg-info-suave text-info",
};

let proximoId = 1;

export function ProvedorToast({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remover = useCallback((id: number) => {
    setToasts((atual) => atual.filter((t) => t.id !== id));
  }, []);

  const mostrar = useCallback(
    (texto: string, tipo: TipoToast = "info") => {
      const id = proximoId++;
      setToasts((atual) => [...atual, { id, tipo, texto }]);
      setTimeout(() => remover(id), 6000);
    },
    [remover],
  );

  const mostrarErro = useCallback(
    (erro: unknown) => mostrar(paraErroApp(erro).message, "erro"),
    [mostrar],
  );

  return (
    <Contexto.Provider value={{ mostrar, mostrarErro }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tipo === "erro" ? "alert" : "status"}
            className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-lg border-l-4 p-3 shadow-md ${ESTILOS[t.tipo]}`}
          >
            <p className="flex-1">{t.texto}</p>
            <button
              type="button"
              onClick={() => remover(t.id)}
              aria-label="Fechar aviso"
              className="min-h-11 min-w-11 rounded text-xl leading-none"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </Contexto.Provider>
  );
}

export function useToast(): ContextoToast {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("ProvedorToast ausente na árvore de componentes.");
  return ctx;
}
