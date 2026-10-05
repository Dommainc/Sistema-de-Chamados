// Separação de áreas por papel (1A-3, Entrega 1). Experiência, não segurança: RLS + API protegem os dados.

import { NextResponse, type NextRequest } from "next/server";
import { decidirRota } from "@/lib/rotas";
import { COOKIE_SESSAO, usuarioDaSessao } from "@/lib/sessao";

export function proxy(request: NextRequest) {
  const valorCookie = request.cookies.get(COOKIE_SESSAO)?.value;
  const usuario = usuarioDaSessao(valorCookie);
  const decisao = decidirRota(request.nextUrl.pathname, usuario?.papel ?? null);

  if (decisao.tipo === "seguir") return NextResponse.next();

  const resposta = NextResponse.redirect(new URL(decisao.para, request.url));
  if (!usuario && valorCookie) resposta.cookies.delete(COOKIE_SESSAO); // cookie inválido
  return resposta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|ico|webp)$).*)"],
};
