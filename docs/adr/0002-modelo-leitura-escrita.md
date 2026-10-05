# ADR 0002 — Quem lê e quem grava no banco

**Status:** aceito · **Data:** 2026-10-03

## Decisão
| Papel do Postgres | Usado por | Pode |
|---|---|---|
| `anon` | ninguém | nada |
| `authenticated` | front (anon key + JWT) e FastAPI ao **ler** | só SELECT, filtrado por RLS; editar o próprio departamento/telefone |
| `central_api` | FastAPI ao **gravar** | INSERT/UPDATE; nunca DELETE em chamados, mensagens, anexos, histórico |
| `service_role` | FastAPI só para Storage (URLs assinadas) e jobs | tudo — nunca vai para o front |

Fluxo de uma ação na FastAPI (uma transação):
1. `set local role authenticated` + claims do JWT do usuário → lê o chamado **sob RLS**.
   Se não vier linha → `SEM_PERMISSAO` / `CHAMADO_NAO_ENCONTRADO`.
2. Valida a transição na máquina de estados (`apps/api/app/dominio/estados.py`).
3. `reset role` → grava como `central_api` (chamado + histórico + notificação pendente).

## Motivos
- Usuário não consegue contornar a máquina de estados chamando o Supabase direto:
  ele não tem permissão de escrita em nenhuma tabela de negócio.
- A checagem de acesso usa o **mesmo RLS** do front, não uma regra paralela em Python.
- Mesmo com bug na API, o banco impede: excluir chamado, alterar histórico,
  editar chamado encerrado, mensagem interna de solicitante, trocar o número.

## Consequências
- Tabelas novas não recebem permissão automática (os defaults do Supabase foram
  revogados na migration 0010). Toda migration nova precisa de GRANT + policy explícitos.
- A senha de `central_api` é definida manualmente por ambiente (ver `docs/segredos.md`).
- **Validar no projeto dev:** `grant authenticated to central_api` (migration 0001)
  precisa ser aceito pelo papel `postgres` do Supabase hospedado.
