// Link universal /chamados/42: redireciona o solicitante para /meus-chamados/42 e a TI para /atendimento/42.

import { NextResponse, type NextRequest } from "next/server";
import { destinoLinkUniversal } from "@/lib/rotas";
import { COOKIE_SESSAO, usuarioDaSessao } from "@/lib/sessao";

export async function GET(request: NextRequest, ctx: RouteContext<"/chamados/[id]">) {
  const { id } = await ctx.params;
  const usuario = usuarioDaSessao(request.cookies.get(COOKIE_SESSAO)?.value);
  const destino = usuario ? destinoLinkUniversal(id, usuario.papel) : "/login";
  return NextResponse.redirect(new URL(destino, request.url));
}
