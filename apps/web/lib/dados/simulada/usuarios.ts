// Usuários da versão simulada (ADR 0006). Nomes alinhados ao mockup (docs/ui-ux.md).
// Lista fixa: é daqui que o proxy tira o papel, nunca de um papel gravado no navegador.

import type { Perfil } from "@/lib/dominio/tipos";

function perfil(
  id: string,
  nome: string,
  email: string,
  papel: Perfil["papel"],
  departamento: string | null,
  telefone: string | null = null,
): Perfil {
  return { id, nome, email, papel, departamento, telefone, ativo: true };
}

/** Quem aparece na tela "Entrar como". */
export const USUARIOS_SIMULADOS: readonly Perfil[] = [
  // Ana começa sem departamento: testa o primeiro acesso.
  perfil(
    "aaaaaaaa-0000-0000-0000-000000000001",
    "Ana Souza",
    "ana@teste.local",
    "solicitante",
    null,
  ),
  perfil(
    "bbbbbbbb-0000-0000-0000-000000000002",
    "Bruno Teixeira",
    "bruno@teste.local",
    "solicitante",
    "Financeiro",
    "(21) 99999-0002",
  ),
  perfil(
    "cccccccc-0000-0000-0000-000000000003",
    "Rafael Lima",
    "tec@teste.local",
    "ti",
    "TI",
    "(21) 99999-0003",
  ),
  perfil(
    "dddddddd-0000-0000-0000-000000000004",
    "Thiago Martins",
    "thiago@teste.local",
    "ti",
    "TI",
    "(21) 99999-0004",
  ),
];

/** Outros colaboradores que só aparecem nos chamados de exemplo (não entram no sistema). */
export const OUTROS_PERFIS_EXEMPLO: readonly Perfil[] = [
  perfil(
    "e0000000-0000-0000-0000-000000000001",
    "Carla Mendes",
    "carla@teste.local",
    "solicitante",
    "Financeiro",
    "(21) 98888-0001",
  ),
  perfil(
    "e0000000-0000-0000-0000-000000000002",
    "João Pires",
    "joao@teste.local",
    "solicitante",
    "Engenharia",
    "(21) 98888-0002",
  ),
  perfil(
    "e0000000-0000-0000-0000-000000000003",
    "Marina Costa",
    "marina@teste.local",
    "solicitante",
    "RH",
    "(21) 98888-0003",
  ),
  perfil(
    "e0000000-0000-0000-0000-000000000004",
    "Lucas Prado",
    "lucas@teste.local",
    "solicitante",
    "Obra Barra",
    null,
  ),
  perfil(
    "e0000000-0000-0000-0000-000000000005",
    "Diego Nunes",
    "diego@teste.local",
    "solicitante",
    "Projetos",
    "(21) 98888-0005",
  ),
  perfil(
    "e0000000-0000-0000-0000-000000000006",
    "Paula Reis",
    "paula@teste.local",
    "solicitante",
    "Jurídico",
    "(21) 98888-0006",
  ),
];

export function usuarioSimuladoPorId(id: string | undefined | null): Perfil | null {
  if (!id) return null;
  return USUARIOS_SIMULADOS.find((u) => u.id === id) ?? null;
}
