# ADR 0007 — Como a API valida o login e lê o grupo do Entra

**Status:** aceito (a parte do grupo é **provisória** até o App Registration existir) · **Data:** 2026-10-06

## Contexto
O front faz login pelo Supabase Auth (provider Azure / Entra ID) e manda o token (JWT) para a API no cabeçalho
`Authorization: Bearer`. A API precisa (1) confirmar que o token é legítimo e (2) saber se a pessoa é da TI,
pelo grupo **Central-Chamados-TI** ([ADR 0004](0004-papeis-entra-id.md)).

## Decisão

### 1. Validação do token (`app/auth.py`)
- **Primeiro: chaves públicas do projeto (JWKS)** — `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`, algoritmos
  `RS256`/`ES256`. É o modelo atual do Supabase e **não exige guardar segredo** na API. As chaves ficam em cache
  por 1 hora.
- **Alternativa: `SUPABASE_JWT_SECRET` (HS256)** — para projetos que ainda assinam com segredo compartilhado e
  para o ambiente local. Só é aceito se o segredo estiver configurado.
- Exige `exp`, `sub` e `aud = authenticated`. Qualquer falha (ausente, inválido, expirado, assinatura errada) →
  `SESSAO_EXPIRADA` (401), sempre com a mesma mensagem.
- Perfil com `ativo = false` → `SEM_PERMISSAO` (checado ao ler o perfil sob RLS).

### 2. Papel pelo grupo (`app/dominio/papel.py`, `POST /auth/sincronizar`)
- Procura a lista de grupos, nesta ordem: claim `groups` · `user_metadata.custom_claims.groups` ·
  `user_metadata.groups`.
- Contém `ENTRA_GRUPO_TI_ID` → `ti`; não contém → `solicitante`.
- **Sem o claim** → fica `solicitante` e registra aviso no log (menor privilégio).
- `AMBIENTE=dev` (local) → não muda o papel; quem define é o `seed.dev.sql`.

## Pendente de validação (quando o Entra existir)
- Confirmar **onde** o Supabase entrega o claim `groups` do Azure e ajustar `extrair_grupos` se preciso.
- Se o Supabase **não repassar** o claim, o plano B (consultar o Graph só no login) precisa de aprovação,
  porque é uma integração além das permitidas (CLAUDE.md).

## Consequências
- Em produção a API não precisa do segredo do JWT (menos um segredo para guardar e trocar).
- Mudança no lugar do claim exige só ajuste em `app/dominio/papel.py` + teste.
