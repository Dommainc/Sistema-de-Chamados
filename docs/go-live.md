# Go-live — roteiro do dia em que o Supabase for assinado

Passo a passo para colocar a Central no ar, na ordem. Cada passo tem **como conferir**. Marque `[x]` ao terminar e
anote data e responsável. Nada aqui foi executado ainda (aguarda P-022).

> Os mesmos passos valem para `dev` (primeiro) e `prod` (depois que o `dev` passar no teste final).
> Valores de chaves **nunca** entram neste arquivo: ficam na Vercel / no painel do Supabase ([segredos.md](segredos.md)).

## 0. Antes de começar
- [ ] Supabase assinado (P-022); App Registration do Entra criado com o grupo **Central-Chamados-TI** (ADR 0004).
- [ ] CI verde na `main` (front, API e banco — o job `banco` já roda todas as migrations e testes do zero).
- [ ] Supabase CLI instalado na máquina de quem vai executar (`supabase --version`).

## 1. Criar os projetos
- [ ] Projetos `central-chamados-dev` e `central-chamados-prod`, região **South America (São Paulo) — sa-east-1**
  ([ADR 0001](adr/0001-supabase-sa-east-1.md)). Senha do banco forte, guardada no cofre da TI.
- [ ] Conferir em Settings → General que a região é `sa-east-1`.
- [ ] `prod` no **plano Pro** (backups diários; avaliar PITR — escopo, seção 10).
- [ ] Conferir que a versão do Postgres é a mesma do `supabase/config.toml` (`major_version = 17`).

## 2. Rodar as migrations
```bash
supabase link --project-ref <ref do projeto>
supabase db push            # aplica as 18 migrations
```
- [ ] Conferir: `supabase migration list` mostra todas como aplicadas, local e remoto iguais.
- [ ] Conferir: `grant authenticated to central_api` funcionou (migration 0001) — `select pg_has_role('central_api', 'authenticated', 'member');` → `true`.
- [ ] Depois do primeiro go-live, isso passa a ser automático: preencher as variáveis do workflow
  `.github/workflows/migrations.yml` (passo 9).

## 3. Dados iniciais (P-014)
O `db push` **não roda seed**. O `supabase/seed.sql` (área TI, 12 categorias, formulários, feriados até 2027,
configurações) foi escrito para poder rodar mais de uma vez (`on conflict do nothing`):
```bash
psql "<connection string do projeto, usuário postgres>" -f supabase/seed.sql
```
- [ ] Conferir: `select count(*) from public.categorias;` → 12.
- [ ] **Nunca** rodar o `seed.dev.sql` na nuvem (usuários de teste com senha conhecida).
- [ ] Conferir: `select valor from public.configuracoes where chave = 'dominios_permitidos';` → `["dommainc.com.br"]`
  (sem `teste.local`).

## 4. Senha do papel da API (`central_api`)
```sql
alter role central_api with login password '<senha forte>';
```
- [ ] Montar a `DATABASE_URL` com o **pooler em modo transaction (porta 6543)**, usuário `central_api` (ver
  [runbooks/rotacionar-chave.md](runbooks/rotacionar-chave.md)). Anotar a data em [segredos.md](segredos.md).

## 5. Login: só Microsoft e só DOMMA (P-005, P-035)
- [ ] Authentication → Providers → **Email: desligado** (login só com conta Microsoft; no `config.toml` ele fica
  ligado apenas para o ambiente local/CI).
- [ ] Authentication → Providers → **Azure: ligado**, com Client ID, Client Secret e a URL do tenant da DOMMA
  (`https://login.microsoftonline.com/<tenant-id>`). Anotar o **vencimento do Client Secret** em segredos.md.
- [ ] No Entra: App Registration **single-tenant** (só contas da DOMMA), redirect URI
  `https://<ref>.supabase.co/auth/v1/callback`, claim `groups` configurado (ADR 0004).
- [ ] Authentication → URL Configuration: Site URL = endereço do front na Vercel; Redirect URLs = `<front>/auth/callback`.
- [ ] Authentication → Sessions: **limitar a sessão** (ex.: 12 h) e o tempo de inatividade. Assim, quem foi
  desligado no Microsoft perde o acesso também nas sessões que já estavam abertas.
- [ ] Segunda barreira já está no banco (migration 0018): e-mail fora de `@dommainc.com.br` ganha perfil **inativo**
  e não vê nem faz nada.

**Quando alguém sai da empresa:** a TI bloqueia a conta no Microsoft (não entra mais). Se quiser registrar na Central
também: `update public.profiles set ativo = false where email = '<email>';` (o histórico dos chamados é mantido).

## 6. Storage
- [ ] Conferir que o bucket `anexos` existe e é **privado** (migration 0011), limite de 10 MB.

## 7. Vercel — API (`apps/api`, projeto `central-chamados-api`, região `gru1`)
Variáveis (Settings → Environment Variables), conforme `apps/api/.env.example`:
- [ ] `AMBIENTE=prod` (no dev: `dev`)
- [ ] `DATABASE_URL` (passo 4) · `SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY` · `ENTRA_GRUPO_TI_ID`
- [ ] `WEB_ORIGEM` = endereço do front (CORS)
- [ ] `SUPABASE_JWT_SECRET` **só** se o projeto ainda assinar tokens com HS256 (o padrão novo usa JWKS, sem segredo)
- [ ] Primeiro deploy: conferir se a Vercel achou a FastAPI em `app/main.py`; senão, ajustar `vercel.json` (P-032).
- [ ] Conferir: `GET <api>/saude` → `{"status": "ok", "banco": "ok", "ambiente": "prod"}`.

## 8. Vercel — front (`apps/web`, projeto `central-chamados-web`, região `gru1`)
- [ ] `NEXT_PUBLIC_FONTE_DADOS=real` (o build de produção recusa `simulada`)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` (**anon**, nunca a service_role) · `NEXT_PUBLIC_API_URL`
- [ ] `NEXT_PUBLIC_LOGIN_DEV` **vazio ou ausente** (o botão de login de teste nunca existe em produção)
- [ ] Conferir: a faixa "Modo de demonstração" **não** aparece.

## 9. Migrations automáticas (`.github/workflows/migrations.yml`)
- [ ] GitHub → Settings → Environments: criar `dev` e `prod` (este com **revisor obrigatório**).
- [ ] Em cada environment: secrets `SUPABASE_ACCESS_TOKEN` e `SUPABASE_DB_PASSWORD` (a senha do banco daquele projeto).
- [ ] Variáveis **do repositório** (Settings → Secrets and variables → Actions → Variables): `SUPABASE_DEV_PROJECT_ID`
  e `SUPABASE_PROD_PROJECT_ID`. Enquanto estiverem vazias, o workflow não faz nada.
- [ ] A partir daí: merge na `main` aplica no `dev` sozinho; `prod` só manual, com aprovação.

## 10. Teste final (com pessoas de verdade)
- [ ] Colaborador `@dommainc.com.br` entra com a conta Microsoft → primeiro acesso → abre um chamado com print colado.
- [ ] Técnico do grupo **Central-Chamados-TI** entra → cai na área técnica → assume, conversa, anota no Relato
  técnico, transfere para outro técnico → o outro assume e conclui.
- [ ] O colaborador vê a conversa, **não** vê o Relato técnico, e vê o chamado como concluído.
- [ ] Conta de fora da DOMMA (convidado) não consegue usar a Central.
- [ ] Link universal `/chamados/<número>` abre a tela certa para cada um.
- [ ] Tabela `notificacoes` tem os avisos como `pendente` (o bot do Teams entra na 1E — por último).
- [ ] Backup: conferir em Database → Backups que os backups diários estão ativos ([runbooks/restaurar-backup.md](runbooks/restaurar-backup.md)).
- [ ] **Restauração testada antes do go-live** (escopo, seção 10): seguir o "Teste periódico" do runbook — restaurar o backup do `dev` num projeto temporário e abrir a Central contra ele.

Depois do `prod` no ar: atualizar `docs/fases/STATUS.md` (registro de mudanças) e fechar P-022, P-032 e P-035 em
`docs/pendencias.md`.
