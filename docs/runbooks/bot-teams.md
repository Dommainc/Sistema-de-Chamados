# Runbook — instalar o bot do Teams ("Central de Chamados")

Como ligar os avisos no Teams ([ADR 0018](../adr/0018-bot-do-teams-dentro-da-api.md)). Faça na ordem. Valores de
segredo **nunca** vão para o chat, para o Git ou para este arquivo: só para a Vercel e para o Vault do Supabase.

Troque `<central>` pelo endereço da Central (hoje `https://sistema-de-chamados-rouge-nine.vercel.app`).

## 1. Registrar o bot

**Caminho usado na DOMMA (2026-10-16): Portal do Desenvolvedor do Teams** — não precisa de assinatura do Azure.
1. [dev.teams.microsoft.com](https://dev.teams.microsoft.com) → ícone de lápis (**Ferramentas**) → **Gerenciamento
   de bot** → **+ Novo bot** → nome `central-chamados-domma`.
2. **Configurar** → **Endereço do ponto de extremidade:** `<central>/api/bot/mensagens` → **Salvar**.
   **Canais** → Microsoft Teams ligado.
3. **Segredos do cliente** → **Adicionar** → copiar o valor na hora → é o `BOT_APP_SEGREDO`.
4. **ID do bot** (lista de bots) → `BOT_APP_ID`. **ID do Locatário** (Entra → Visão geral) → `BOT_TENANT_ID`.
5. O App Registration aparece como "Várias organizações", mas o Teams trata o bot como **da DOMMA** (o
   endereço do Teams vem com o ID da DOMMA: `smba.trafficmanager.net/br/<tenant>/`). **Não** usar
   `BOT_MULTILOCATARIO` (ou deixar `false`): o token vem do diretório da DOMMA. Com `true` (diretório do Bot
   Framework) o Teams responde **401** — testado em 2026-10-16. Só pessoas da DOMMA falam com o bot.

**Alternativa com assinatura do Azure — recurso Azure Bot (F0, gratuito):**
1. [portal.azure.com](https://portal.azure.com) → **Criar um recurso** → pesquisar **Azure Bot** → **Criar**.
2. Preencher:
   - **Identificador do bot:** `central-chamados-domma`
   - **Assinatura:** a da DOMMA · **Grupo de recursos:** criar novo, `central-chamados`
   - **Residência de dados:** Global
   - **Plano de preços:** clicar em *Alterar plano* → **Gratuito (F0)**
   - **Tipo de aplicativo:** **Locatário único** (Single Tenant)
   - **Tipo de criação:** *Criar nova ID de Aplicativo Microsoft*
3. **Revisar + criar** → **Criar**. Quando terminar, **Ir para o recurso**.
4. **Configuração**:
   - **Ponto de extremidade de mensagens:** `<central>/api/bot/mensagens` → **Aplicar**.
   - Copiar **ID do Aplicativo Microsoft** → é o `BOT_APP_ID`.
   - Copiar **ID do Locatário do Aplicativo** → é o `BOT_TENANT_ID`.
   - Clicar em **Gerenciar Senha** → abre o App Registration → **Certificados e segredos** → **Novo segredo do
     cliente** (validade 24 meses) → copiar o **Valor** na hora (ele some depois) → é o `BOT_APP_SEGREDO`.
     Anotar o vencimento em [segredos.md](../segredos.md).
5. **Canais** → **Microsoft Teams** → aceitar os termos → **Aplicar**.

## 2. Segredo do processador
No terminal do VS Code, gerar um segredo aleatório (não cole no chat):
```
python -c "import secrets; print(secrets.token_urlsafe(32))"
```
Esse valor é o `PROCESSADOR_SEGREDO`. Ele vai em dois lugares: Vercel (passo 3) e Vault (passo 4).

## 3. Vercel — variáveis da API
Settings → Environment Variables (Production): `BOT_APP_ID`, `BOT_APP_SEGREDO`, `BOT_TENANT_ID`,
`PROCESSADOR_SEGREDO`. Depois **Redeploy** (variável nova só vale num deploy novo).
`BOT_MULTILOCATARIO=true` só para bot registrado como multi-tenant no Bot Framework (se o Teams responder 401 com
`false`, tentar `true`, e vice-versa).

Conferir (terminal):
```
curl -X POST <central>/api/internal/notificacoes/processar -H "X-Central-Secret: <segredo>"
```
→ `{"configurado": true, ...}` (com `false`, faltou alguma variável do bot).

## 4. Supabase — deixar o banco chamar a API
SQL Editor → **New query** (não salvar a query, porque ela tem o segredo):
```sql
select vault.create_secret('<central>/api', 'central_api_url');
select vault.create_secret('<o mesmo PROCESSADOR_SEGREDO>', 'central_processador_segredo');
```
A partir daí, a cada minuto o banco chama a API se houver aviso esperando (`app.disparar_envio_teams()`).
Para trocar um valor depois: `select vault.update_secret((select id from vault.secrets where name = 'central_api_url'), '<novo>');`

## 5. Pacote do app do Teams
No terminal do VS Code, na raiz do projeto (precisa do Pillow: `pip install pillow`):
```
python apps/bot-teams/gerar_pacote.py --app-id <BOT_APP_ID> --central <central>
```
Gera `apps/bot-teams/dist/central-chamados-teams.zip`.

## 6. Teams — instalar para todos
1. **Testar só com você primeiro:** Teams → **Aplicativos** → **Gerenciar seus aplicativos** → **Carregar um
   aplicativo** → escolher o .zip. Abrir o app e escrever "oi": deve vir a resposta automática.
2. **Para todos** (admin do Teams), em [admin.teams.microsoft.com](https://admin.teams.microsoft.com):
   - **Aplicativos do Teams → Gerenciar aplicativos → Carregar novo aplicativo** → o .zip.
   - **Aplicativos do Teams → Políticas de configuração → Global (padrão para toda a organização)** →
     **Aplicativos instalados → Adicionar aplicativos** → "Central de Chamados" → **Salvar**.
     (Opcional: também em **Aplicativos fixados**, para aparecer na barra lateral.)
   - O Teams leva **até 24 horas** para instalar em todo mundo.

## 7. Conferir
- Abrir um chamado na Central → em até 1 minuto chega o aviso no Teams com o botão **Abrir chamado**.
- Avisos que não foram:
  ```sql
  select id, tipo, status, tentativas, erro, criado_em
    from public.notificacoes order by id desc limit 20;
  ```
  `pessoa sem conversa com o bot` = o app ainda não foi instalado para ela. Ver também [bot-parado.md](bot-parado.md).

## Atualizar o app (nova versão do pacote)
Aumentar `"version"` em `apps/bot-teams/gerar_pacote.py`, gerar de novo e, no admin do Teams, abrir o app →
**Carregar arquivo** com o .zip novo.
