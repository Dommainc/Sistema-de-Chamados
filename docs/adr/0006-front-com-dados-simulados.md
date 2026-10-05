# ADR 0006 — Front com camada de dados e versão simulada

**Status:** aceito · **Data:** 2026-10-05 · **Relacionado:** P-022, P-024 em `docs/pendencias.md`

## Contexto
O Supabase está em avaliação pela diretoria (custo e novo projeto) e o dono decidiu não ligar banco algum até lá.
A etapa 1A-3 (telas) pressupunha a 1A-2 (API) e o Supabase prontos.

## Decisão
O front (`apps/web`) acessa dados **somente** pela camada `lib/dados/`, que define uma interface (`FonteDeDados`) com
duas implementações:

| Implementação | Quando | Como funciona |
|---|---|---|
| `simulada` | agora, até existir banco | Dados de exemplo no navegador (`localStorage`), login falso escolhendo Ana, Bruno ou Técnico. Sincroniza abas abertas (`BroadcastChannel`) para simular o tempo real. |
| `real` | depois da 1A-2 | Leitura direta do Supabase com a anon key (RLS) e ações pela FastAPI, como no ADR 0002. |

Escolha por `NEXT_PUBLIC_FONTE_DADOS=simulada|real`.

Regras:
1. **Nenhuma tela importa Supabase ou chama a API diretamente**; tudo passa por `lib/dados/`.
2. A versão simulada respeita as **mesmas regras**: máquina de estados do ADR 0005, catálogo de erros, mensagens internas
   invisíveis ao solicitante. Assim as telas já tratam os erros reais.
3. A versão simulada **nunca vai para produção**: o build falha se `simulada` estiver ativa com `VERCEL_ENV=production`.
4. Na versão simulada, o middleware deriva o papel do id do usuário numa lista fixa no servidor, nunca de um papel
   gravado no cliente. Não é segurança (não há dado real); a segurança de verdade continua sendo RLS + API.

## Motivos
- Permite construir e validar as telas com o dono agora, rodando só `pnpm dev` (`localhost:3000`).
- Se o Supabase não for aprovado, as telas continuam valendo; troca-se só a implementação `real`.

## Consequências
- Nova ordem: 1A-3 Entregas 1–3 com dados simulados → 1A-2 (API) + implementação `real` → 1E → 1F.
- O CI da 1A-4 começa só com o front (lint, typecheck, testes, build); banco e API entram quando existirem.
- Dados de exemplo (categorias, campos) são cópia do `supabase/seed.sql` e podem divergir; o seed é a fonte da verdade.
- A máquina de estados existe também em TypeScript (`lib/dominio/estados.ts`) para a versão simulada; na versão real
  a fonte da verdade é a API (`GET /chamados/{id}/acoes`).
