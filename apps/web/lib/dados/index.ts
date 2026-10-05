// Ponto único de criação da camada de dados (ADR 0006).

import { FONTE_DADOS } from "./config";
import { criarFonteSimulada } from "./simulada";
import type { FonteDeDados, UsuarioSessao } from "./tipos";

export function criarFonteDados(usuario: UsuarioSessao): FonteDeDados {
  if (FONTE_DADOS === "simulada") return criarFonteSimulada(usuario.id);
  throw new Error("Fonte de dados real ainda não implementada (depende da 1A-2).");
}

export type * from "./tipos";
