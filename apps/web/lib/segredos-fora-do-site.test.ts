// ADR 0017: site e API no mesmo projeto da Vercel compartilham as variáveis de ambiente. Este teste garante que o
// código do SITE nunca lê os segredos da API (chave secreta do Supabase, senha do banco, segredo do JWT).

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = path.resolve(__dirname, "..");
const PASTAS = ["app", "components", "lib"];
const PROIBIDOS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "SUPABASE_JWT_SECRET",
  "service_role",
];

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = path.join(pasta, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho);
    return /\.(ts|tsx|js|mjs)$/.test(nome) && !nome.endsWith(".test.ts") ? [caminho] : [];
  });
}

describe("segredos da API fora do site", () => {
  it("nenhum arquivo do site menciona a chave secreta, a senha do banco ou o segredo do JWT", () => {
    const achados = PASTAS.flatMap((p) => arquivos(path.join(RAIZ, p))).flatMap((arquivo) => {
      const texto = readFileSync(arquivo, "utf-8");
      return PROIBIDOS.filter((p) => texto.includes(p)).map(
        (p) => `${path.relative(RAIZ, arquivo)}: ${p}`,
      );
    });
    expect(achados).toEqual([]);
  });
});
