# ADR 0008 — Regras da API separadas do banco (repositório) e testes em memória

**Status:** aceito · **Data:** 2026-10-06

## Contexto
As rotas de chamados (abrir, ações, mensagens, anexos, lido) precisavam ser construídas **antes** de existir um
Supabase (aguardando a assinatura da diretoria, P-022). Ao mesmo tempo, as regras de negócio — máquina de estados,
quem pode o quê, histórico e notificação na mesma ação — têm que ser testadas desde já, inclusive "a Ana tentando
fazer ações da TI" e "a Ana mexendo no chamado do Bruno".

## Decisão
Três camadas na API:

| Camada | Arquivo | Papel |
|---|---|---|
| Rotas | `app/routers/chamados.py` | Recebe/valida o JSON, abre **uma transação** por requisição, devolve o resultado |
| Serviços | `app/servicos/chamados.py` | Todas as regras: perfil ativo, visibilidade, `dominio/estados.py`, formulário, anexos, histórico, notificações (`pendente`, ADR 0003) |
| Repositório | `app/repositorios/` | Só acesso a dados, pelo contrato `Repositorio` (`base.py`) |

Duas implementações do repositório e do Storage:

- **`RepositorioPostgres`** (`postgres.py`) — a real. Lê com `set local role authenticated` (RLS filtra) e grava com
  `reset role` (`central_api`), tudo na transação de `app/db.py` (ADR 0002). **`ArmazenamentoSupabase`**
  (`app/integracoes/storage.py`) usa a `service_role` só para Storage.
- **`RepositorioMemoria`** (`memoria.py`) e **`ArmazenamentoMemoria`** — **só para testes**. Imitam o RLS (solicitante
  vê só os próprios chamados; nota interna e seus anexos não aparecem para ele).

Os testes de rota (`tests/rotas/`) trocam as dependências `obter_fabrica_repositorio`, `obter_armazenamento` e
`obter_verificador` e usam tokens HS256 de teste.

Visibilidade: chamado que o solicitante não pode ver **ou** que não existe → sempre `SEM_PERMISSAO` (não revela se
existe). Para a TI, número inexistente → `CHAMADO_NAO_ENCONTRADO`.

## Consequências
- Regras testadas sem banco (95 testes). A versão em memória **nunca** é usada fora dos testes.
- O SQL do `RepositorioPostgres` e as chamadas do Storage foram escritos sem banco: **precisam ser validados** com
  testes de integração (`@pytest.mark.banco`) quando o Supabase existir (pendencias.md P-034).
- O RLS do banco continua sendo a proteção real; a imitação em memória serve para testar a API, não o banco
  (o banco tem os próprios testes pgTAP).
