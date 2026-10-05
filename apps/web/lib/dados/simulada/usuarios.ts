// Usuários da versão simulada (ADR 0006). Os mesmos nomes do login dev do CLAUDE.md.
// Lista fixa: é daqui que o proxy tira o papel, nunca de um papel gravado no navegador.

import type { Perfil } from "@/lib/dominio/tipos";

export const USUARIOS_SIMULADOS: readonly Perfil[] = [
  {
    id: "aaaaaaaa-0000-0000-0000-000000000001",
    nome: "Ana Souza",
    email: "ana@teste.local",
    departamento: null, // começa sem cadastro: testa o primeiro acesso
    telefone: null,
    papel: "solicitante",
    ativo: true,
  },
  {
    id: "bbbbbbbb-0000-0000-0000-000000000002",
    nome: "Bruno Lima",
    email: "bruno@teste.local",
    departamento: "Financeiro",
    telefone: "(21) 99999-0002",
    papel: "solicitante",
    ativo: true,
  },
  {
    id: "cccccccc-0000-0000-0000-000000000003",
    nome: "Técnico da TI",
    email: "tec@teste.local",
    departamento: "TI",
    telefone: "(21) 99999-0003",
    papel: "ti",
    ativo: true,
  },
];

export function usuarioSimuladoPorId(id: string | undefined | null): Perfil | null {
  if (!id) return null;
  return USUARIOS_SIMULADOS.find((u) => u.id === id) ?? null;
}
