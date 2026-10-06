# Runbook — trocar (rotacionar) uma chave ou senha

Inventário completo: [../segredos.md](../segredos.md). Faça primeiro no `dev`, depois no `prod`.

## Senha do papel `central_api` (conexão da API com o banco)
1. Gere uma senha forte (gerenciador de senhas, 32+ caracteres).
2. No SQL Editor do Supabase (projeto certo!):
   ```sql
   alter role central_api with login password '<nova-senha>';
   ```
3. Vercel → projeto **api** → Settings → Environment Variables → atualize `DATABASE_URL`
   (`postgresql://central_api.<ref>:<nova-senha>@<host>:6543/postgres`).
4. Redeploy da API. Teste: `GET /saude` e abrir um chamado de teste.
5. Anote a data em `segredos.md`.

## service_role do Supabase
1. Painel Supabase → Settings → API → **gerar nova service_role** (a antiga para de funcionar).
2. Vercel (api) → `SUPABASE_SERVICE_ROLE_KEY` → atualizar → redeploy.
3. Teste: anexar um arquivo num chamado.
4. **Se vazou:** faça na hora e verifique o log do Storage e do banco.

## Client secret do Azure (vence!)
1. Entra ID → App registrations → Central de Chamados → **Certificates & secrets → New client secret**
   (validade máxima permitida pela política da empresa).
2. Painel Supabase → Authentication → Providers → **Azure** → colar o novo secret → salvar.
3. Teste: sair e entrar com a conta Microsoft.
4. Apague o secret antigo no Entra e anote o novo vencimento em `segredos.md`.

## Segredo do bot / do webhook / CRON_SECRET
1. Gere um valor novo.
2. Atualize **os dois lados ao mesmo tempo** (Vercel da API + configuração do bot, ou + Database Webhook do Supabase).
3. Teste: provocar um aviso (assumir um chamado de teste) e ver a notificação como `enviada`.
