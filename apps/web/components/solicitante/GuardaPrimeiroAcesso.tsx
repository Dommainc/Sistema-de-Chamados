"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useConsulta } from "@/lib/dados/provedor";
import type { FonteDeDados } from "@/lib/dados/tipos";

const consultarPerfil = (fonte: FonteDeDados) => fonte.obterMeuPerfil();

/** Solicitante sem departamento cadastrado vai para /primeiro-acesso (uma única vez). */
export function GuardaPrimeiroAcesso({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { dados: perfil } = useConsulta(consultarPerfil);
  const pendente = perfil?.papel === "solicitante" && !perfil.departamento;

  useEffect(() => {
    if (pendente) router.replace("/primeiro-acesso");
  }, [pendente, router]);

  if (!perfil || pendente) {
    return <p className="p-6 text-center text-texto-suave">Carregando...</p>;
  }
  return <>{children}</>;
}
