# Etapa 1A-2 — Base da FastAPI

> **Andamento (2026-10-06):** base pronta sem banco (itens 1, 3, 4, 7 e as partes puras de 2, 5, 6 e 8).
> Falta rodar contra o Supabase (P-022/P-023). Decisões do login e do grupo: `docs/adr/0007`.

## Objetivo
Esqueleto da API pronto para receber as regras de negócio: conexão com o banco no modelo
"lê como usuário / grava como central_api", autenticação pelo JWT do Supabase, catálogo de
erros e sincronização de papel no login.

## Escopo
1. **Projeto** `apps/api` com `uv`, Python 3.12, FastAPI, asyncpg, pydantic-settings, ruff, pytest.
   Estrutura:
   ```
   apps/api/
     app/main.py              # cria app, registra routers e handlers
     app/config.py            # Settings (pydantic-settings), lê .env
     app/db.py                # pool asyncpg + helpers de transação
     app/auth.py              # valida JWT do Supabase, dependência usuario_atual
     app/erros/catalogo.py    # códigos + mensagens (seção 8 do escopo)
     app/erros/handlers.py    # formato { erro: { codigo, mensagem, detalhe } }
     app/routers/saude.py     # GET /saude
     app/routers/me.py        # GET /me, PATCH /me, POST /auth/sincronizar
     tests/
     vercel.json              # runtime Python, região gru1
     .env.example
   ```
2. **Banco** (`app/db.py`):
   - Conexão como `central_api` via `DATABASE_URL`. Pronto para Supavisor em modo transaction (porta 6543): `statement_cache_size=0`.
   - Context manager `transacao(usuario)`:
     - `como_usuario()`: executa `set local role authenticated` + `set_config('request.jwt.claims', <claims>, true)` para leituras sob RLS;
     - `como_api()`: `reset role` para gravar.
   - Tradução de exceções do Postgres para o catálogo: `42501`→`SEM_PERMISSAO`, `CC001`→`TRANSICAO_INVALIDA`, `CC005`→`SEM_PERMISSAO`, demais `CC00x` e erros inesperados→`ERRO_INESPERADO`.
3. **Auth** (`app/auth.py`):
   - Valida o JWT do Supabase (header `Authorization: Bearer`), via JWKS do projeto ou `SUPABASE_JWT_SECRET` (local).
   - Expirado → `SESSAO_EXPIRADA` (401). Ausente/inválido → 401 com a mesma mensagem.
   - Usuário com `profiles.ativo = false` → `SEM_PERMISSAO`.
4. **Catálogo de erros**: os 14 códigos da tabela do escopo, com placeholders (`{campo}`, `{numero}`, `{de}`, `{para}`, `{ref}`).
   - `ERRO_INESPERADO` gera ref curta `ERR-XXXX` (4 hex), loga com stack trace e devolve só a mensagem amigável.
   - `detalhe` só aparece quando `AMBIENTE=dev`.
   - Erros de validação do Pydantic → `CAMPO_OBRIGATORIO` por campo (lista `campos` no corpo).
5. **`POST /auth/sincronizar`** (chamado pelo front logo após o login):
   - Lê o claim `groups` (do JWT/metadata do usuário — investigar onde o Supabase guarda claims do provider Azure e documentar).
   - Se contém `ENTRA_GRUPO_TI_ID` → `papel = 'ti'`; senão `solicitante`. Atualiza `ultimo_login_em`.
   - Se o claim não existir: mantém `solicitante`, loga aviso. Em `AMBIENTE=dev`, não altera o papel (o seed define).
6. **`GET /me`** (perfil + papel + `cadastro_pendente` = departamento nulo) e **`PATCH /me`** (só departamento e telefone).
7. **Seed de desenvolvimento** `supabase/seed.dev.sql` + ajuste de `supabase/config.toml` (`[db.seed] sql_paths`):
   3 usuários com login e-mail/senha (ver CLAUDE.md), com papel já definido. Só para o ambiente local.
8. **Testes** (pytest contra o Supabase local): saúde, JWT inválido/expirado, sincronização de papel,
   `PATCH /me` não altera papel, formato de erro, ref `ERR-XXXX` em exceção forçada, e
   **solicitante A não lê dados de B pela API**.

9. ~~Migration dos 6 status~~ — já feita: `supabase/migrations/20261005120000_status_simplificados.sql` (P-019).

## Fora do escopo
Rotas de chamados, anexos e telas (1A-3), Teams (1E).

## Critérios de aceite
- `uv run pytest` verde; `ruff check` e `ruff format --check` limpos.
- `/docs` (OpenAPI) mostra as rotas com exemplos de erro.
- Nenhum segredo no código; `.env.example` completo e comentado.
- ADR se surgir decisão nova (ex.: onde ficam os claims do Azure).
