"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FONTE_DADOS } from "@/lib/dados/config";
import { usuarioSimuladoPorId } from "@/lib/dados/simulada/usuarios";
import { inicioDoPapel } from "@/lib/rotas";
import { COOKIE_SESSAO } from "@/lib/sessao";

/** Login da versão simulada: escolhe Ana, Bruno ou Técnico (ADR 0006). */
export async function entrarSimulado(formData: FormData): Promise<void> {
  if (FONTE_DADOS !== "simulada") redirect("/login");
  const usuario = usuarioSimuladoPorId(String(formData.get("usuarioId") ?? ""));
  if (!usuario) redirect("/login");

  (await cookies()).set(COOKIE_SESSAO, usuario.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  redirect(inicioDoPapel(usuario.papel));
}

export async function sair(): Promise<void> {
  (await cookies()).delete(COOKIE_SESSAO);
  redirect("/login");
}
