// Ponto único de criação da camada de dados (ADR 0006).

import { FONTE_DADOS } from "./config";
import { criarFonteReal } from "./real";
import { criarFonteSimulada } from "./simulada";
import type { FonteDeDados, UsuarioSessao } from "./tipos";

export function criarFonteDados(usuario: UsuarioSessao): FonteDeDados {
  if (FONTE_DADOS === "simulada") return criarFonteSimulada(usuario.id);
  return criarFonteReal(usuario);
}

export type * from "./tipos";
