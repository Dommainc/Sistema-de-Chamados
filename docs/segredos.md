# Segredos — inventário

**Nenhum valor fica neste arquivo nem no código.** Aqui só consta o que existe, onde é usado e como trocar.
Regras: `.env` e `.env.*` estão no `.gitignore` (exceto `.env.example`, sem valores); secret scanning e push protection
ligados no GitHub; o que vai para o navegador começa com `NEXT_PUBLIC_` e **nunca** é segredo.

| Chave | Onde é usada | Quem pode ver | Onde fica guardada | Validade | Como trocar |
|---|---|---|---|---|---|
| **anon key** do Supabase (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) | Navegador (leitura sob RLS) | Pública por natureza (o RLS protege) | Vercel (projeto web) | Sem validade | Painel Supabase → API → gerar nova; atualizar Vercel |
| **service_role** do Supabase (`SUPABASE_SERVICE_ROLE_KEY`) | Só a API: URLs assinadas do Storage e jobs | Só quem administra a API | Vercel (projeto api), environment `prod`/`dev` | Sem validade | Painel Supabase → API → rotacionar; atualizar Vercel; redeploy. **Vazou? Trocar na hora** |
| **Senha do papel `central_api`** (`DATABASE_URL`) | API (conexão com o banco) | Só quem administra a API | Vercel (projeto api) | Trocar a cada 6 meses | [runbooks/rotacionar-chave.md](runbooks/rotacionar-chave.md) |
| **JWT secret / chaves JWKS** do Supabase (`SUPABASE_JWT_SECRET`, se usado) | API (validar o login) | Só quem administra a API | Vercel (projeto api) | Conforme o Supabase | Painel Supabase → JWT; a API prefere JWKS (sem segredo) |
| **Client secret do Azure** (App Registration) | Supabase Auth (login Microsoft) | Admin do Entra e do Supabase | Painel Supabase → Auth → Azure | ⚠️ **Vence** (máx. 24 meses) — anotar a data | Entra → App Registration → Certificates & secrets → novo secret; colar no Supabase; apagar o antigo |
| **ID do grupo Central-Chamados-TI** (`ENTRA_GRUPO_TI_ID`) | API (definir papel `ti`) | Não é segredo, mas não divulgar | Vercel (projeto api) | — | Se o grupo for recriado |
| **Segredo do bot** (`X-Central-Secret` / `BOT_SEGREDO`) | API ↔ bot do Teams | Admin da API e do bot | Vercel (api) e configuração do bot | Trocar a cada 6 meses | Gerar novo, atualizar os dois lados ao mesmo tempo |
| **Segredo do webhook de notificações** (`WEBHOOK_SEGREDO`) | Banco → API (`/internal/notificacoes/processar`) | Admin da API | Vercel (api) + Database Webhook do Supabase | Trocar a cada 6 meses | Atualizar Vercel e o webhook |
| **CRON_SECRET** da Vercel | Cron → API (reprocessar notificações) | Admin da API | Vercel (api) | — | Vercel → Settings → Cron |
| **Senha dos usuários de teste** (`teste123`) | Só ambiente **local** (`seed.dev.sql`) | Todos (não é segredo) | Repositório | — | Nunca existe em dev/prod na nuvem |

## Proteções do site e da API

| Onde | Proteção | Arquivo |
|---|---|---|
| Site (Next.js) | **CSP**: scripts, estilos, imagens e conexões só do próprio site, do Supabase (`https`/`wss`) e da API; ninguém abre a Central dentro de outro site (`frame-ancestors 'none'`) | `apps/web/next.config.ts` |
| Site | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` (sem câmera/microfone/localização pelo navegador), HSTS; sem `X-Powered-By` | `apps/web/next.config.ts` |
| API (FastAPI) | CORS só para `WEB_ORIGEM`; mesmos cabeçalhos + `Cache-Control: no-store` | `apps/api/app/main.py`, `app/seguranca.py` |
| API | Corpo de requisição até **1 MB** (arquivos vão direto ao Storage) → acima disso, 413 | `apps/api/app/seguranca.py` |
| API | Documentação interativa (`/docs`, `/openapi.json`) **fechada em produção** | `apps/api/app/main.py` |

Testes: `apps/api/tests/test_seguranca.py` e `apps/web/e2e/seguranca.spec.ts` (inclui "nenhuma tela bloqueada pela CSP").
Se o site passar a carregar algo de outra origem (ex.: imagem externa), ajuste a CSP — senão o navegador bloqueia.

## Responsáveis e datas
| Item | Responsável | Próxima troca / vencimento |
|---|---|---|
| Client secret do Azure | (definir) | (anotar na criação) |
| Senha `central_api` dev / prod | (definir) | (anotar na criação) |
| Segredo do bot e do webhook | (definir) | (anotar na criação) |
