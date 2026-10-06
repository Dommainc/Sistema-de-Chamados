# Central de Chamados — API (`apps/api`)

FastAPI (Python 3.12) + asyncpg + Pydantic v2. Regras gerais no `CLAUDE.md` da raiz; decisões em `docs/adr/`.

## Rodar

```bash
pip install uv              # uma vez (ou o instalador oficial do uv)
uv sync                     # instala Python 3.12 e as dependências
cp .env.example .env        # e preencha
uv run fastapi dev app/main.py   # http://localhost:8000/docs
```

> Se o comando `uv` não for encontrado depois do `pip install`, use `python -m uv ...`.

## Verificar

```bash
uv run ruff check . && uv run ruff format --check .
uv run pytest               # testes com banco (marcados "banco") são pulados sem DATABASE_URL
```

## Onde fica cada coisa

| Arquivo | Conteúdo |
|---|---|
| `app/main.py` | Cria a API, CORS, handlers de erro e rotas |
| `app/config.py` | Configuração lida do ambiente (`.env.example`) |
| `app/auth.py` | Valida o login (JWT do Supabase: JWKS ou segredo) — ADR 0007 |
| `app/db.py` | Transação "lê como o usuário, grava como central_api" — ADR 0002 |
| `app/erros/` | Catálogo de erros (igual ao do front) e formato das respostas |
| `app/dominio/estados.py` | **Máquina de estados — fonte única** (o front espelha) |
| `app/dominio/formulario.py` | Validação do formulário dinâmico |
| `app/dominio/papel.py` | Papel pelo grupo do Entra (provisório até o Entra existir) |
| `app/routers/` | `GET /saude`, `GET/PATCH /me`, `POST /auth/sincronizar` |
