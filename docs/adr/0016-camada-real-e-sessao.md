# ADR 0016 — Camada `real` do front e sessão com o Supabase Auth

**Status:** aceito · **Data:** 2026-10-15 · **Complementa:** [ADR 0002](0002-modelo-leitura-escrita.md),
[ADR 0006](0006-front-com-dados-simulados.md), [ADR 0007](0007-autenticacao-api.md)

## Contexto
O dono decidiu começar o Supabase no plano Free (projeto `dev`, sa-east-1). As telas já falam só com o contrato de
`lib/dados/` (ADR 0006); faltava a implementação `real` e a sessão de verdade.

## Decisão
- **Sessão:** Supabase Auth com `@supabase/ssr` — a sessão fica em **cookies** (compartilhada entre navegador e
  servidor). O `proxy.ts` renova a sessão a cada requisição e decide a área pelo **papel do perfil** (`profiles`, lido
  sob RLS). Usuário logado sem perfil ativo (fora de `@dommainc.com.br` ou desativado — migration 0018) vai para
  `/conta-sem-acesso`.
- **Login:** "Entrar com a conta Microsoft" (provider `azure`). A volta (`/auth/callback`) troca o código pela sessão e
  chama `POST /auth/sincronizar` (papel pelo grupo do Entra — ADR 0004). Login por e-mail/senha dos usuários de teste
  só com `NEXT_PUBLIC_LOGIN_DEV=true` (local/CI); o `next.config.ts` recusa isso em produção. **Na nuvem, só Microsoft.**
- **Dados (`lib/dados/real/`):** leituras direto do Supabase com a anon key (tabelas e as views `chamados_quadro`,
  `chamados_encerrados`, `perfis_publicos`); ações pela FastAPI com `Authorization: Bearer <token>`; anexos enviados
  direto ao Storage pela URL assinada da API; **Realtime** (`chamados`, `mensagens`, `historico`) avisa as telas.
- **Erros:** resposta da API e do PostgREST viram `ErroApp` do catálogo (o texto pronto da API é o mesmo catálogo);
  sessão vencida leva a `/login?motivo=sessao`.
- **Teste:** `lib/dados/real/integracao.test.ts` roda no CI (job `banco`) contra o Supabase local e a API de verdade.

## Consequências
- O modo simulado continua para a demonstração (branch `demo`); produção só aceita `real`.
- Falta validar com o Entra de verdade se o claim `groups` chega no token do Supabase (ADR 0004).
