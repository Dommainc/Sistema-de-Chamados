"use client";

// Disponibiliza a sessão e a camada de dados para os componentes de cliente.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ErroApp, paraErroApp } from "@/lib/erros/catalogo";
import { criarFonteDados } from "./index";
import type { FonteDeDados, UsuarioSessao } from "./tipos";

interface ContextoDados {
  usuario: UsuarioSessao;
  fonte: FonteDeDados;
}

const Contexto = createContext<ContextoDados | null>(null);

export function ProvedorDados({
  usuario,
  children,
}: {
  usuario: UsuarioSessao;
  children: React.ReactNode;
}) {
  const valor = useMemo(() => ({ usuario, fonte: criarFonteDados(usuario) }), [usuario]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

function useContexto(): ContextoDados {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("ProvedorDados ausente na árvore de componentes.");
  return ctx;
}

export function useUsuario(): UsuarioSessao {
  return useContexto().usuario;
}

export function useDados(): FonteDeDados {
  return useContexto().fonte;
}

export interface Consulta<T> {
  dados: T | undefined;
  erro: ErroApp | null;
  carregando: boolean;
}

/**
 * Executa uma leitura e repete quando os dados mudam (aoMudar).
 * `consultar` deve ser estável (useCallback) para não repetir a cada render.
 */
export function useConsulta<T>(consultar: (fonte: FonteDeDados) => Promise<T>): Consulta<T> {
  const fonte = useDados();
  const [estado, setEstado] = useState<Consulta<T>>({
    dados: undefined,
    erro: null,
    carregando: true,
  });

  const executar = useCallback(() => {
    let ativo = true;
    consultar(fonte).then(
      (dados) => ativo && setEstado({ dados, erro: null, carregando: false }),
      (erro: unknown) =>
        ativo && setEstado({ dados: undefined, erro: paraErroApp(erro), carregando: false }),
    );
    return () => {
      ativo = false;
    };
  }, [consultar, fonte]);

  useEffect(() => {
    let cancelarAtual = executar();
    const cancelarAssinatura = fonte.aoMudar(() => {
      cancelarAtual();
      cancelarAtual = executar();
    });
    return () => {
      cancelarAtual();
      cancelarAssinatura();
    };
  }, [executar, fonte]);

  return estado;
}
