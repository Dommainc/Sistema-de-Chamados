# ADR 0018 — Bot do Teams próprio, dentro da API da Central

**Status:** aceito · **Data:** 2026-10-16 · **Substitui:** "Bot do Teams já existente (projeto separado), via
`POST /notificar`" do `CLAUDE.md` e o contrato da `docs/fases/1E-teams.md`

## Contexto
O plano era ligar a Central ao bot do Teams que a TI já tinha. O dono não tem mais o código dele ("acho que
perdi, talvez tenhamos que fazer do 0"). Manter um segundo projeto só para repassar avisos também seria mais uma
coisa para hospedar, proteger e explicar.

## Decisão
- **O bot é a própria API da Central.** O Teams entrega as mensagens em `POST /api/bot/mensagens`; a API responde
  e manda os avisos. Nenhum serviço novo para hospedar.
- **Sem SDK do Bot Framework:** a API REST do Bot Framework com `httpx` (token por *client credentials* do App
  Registration do bot, single-tenant). O token que o Teams manda é conferido com PyJWT (emissor do Bot Framework
  ou do Entra da DOMMA, público = App ID, `serviceUrl` igual ao da mensagem).
- **Registro do bot pelo Portal do Desenvolvedor do Teams** (a DOMMA não tem assinatura do Azure; sem custo).
  O Teams trata esse bot como da DOMMA: o token vem do diretório da DOMMA (`BOT_MULTILOCATARIO` desligado; ligado,
  o Teams responde 401). App em modo **só avisos** (`isNotificationOnly`): ninguém escreve para o bot.
  Com assinatura, o recurso Azure Bot F0 (gratuito, single-tenant) também funciona.
- **App do Teams "Central de Chamados"** (pacote gerado por `apps/bot-teams/gerar_pacote.py`), instalado para
  todos pela política de configuração do Teams. Quando o app é instalado, o Teams avisa a Central, que guarda a
  conversa em `teams_conversas`. A ligação com o perfil é pelo **e-mail** (lido pela API do Bot Framework, não pelo
  Graph): vale mesmo para quem ainda não entrou na Central (migration 0027).
- **Outbox continua (ADR 0003).** O disparo do envio mudou: em vez de Database Webhook + Vercel Cron (no plano
  gratuito da Vercel o Cron roda uma vez por dia), o **próprio banco** chama a API a cada minuto
  (`pg_cron` + `pg_net` → `POST /api/internal/notificacoes/processar`), só quando há aviso esperando. Endereço e
  segredo ficam no **Vault** do Supabase.
- Envio: até 10 avisos por chamada, `for update skip locked`; falha → nova tentativa em 1 e 5 min; na 3ª falha,
  `falhou` com o erro. Pessoa sem o app → `falhou` na hora ("sem conversa com o bot"). Aviso com mais de 24 h
  parado não é mais enviado (evita mandar de uma vez os avisos acumulados antes de o bot existir).
- **Boas-vindas:** na 1ª instalação do app (`installationUpdate` com `action = add`), o bot manda a mesma
  mensagem da resposta automática. Atualização do app (`add-upgrade`) não repete.
- **Resposta automática:** quem escreve para o bot recebe o texto de `configuracoes.bot_resposta_automatica` e os
  botões "Abrir chamado #N" (último aviso) e "Abrir a Central". Nada vai para o chamado; registro em
  `bot_respostas_automaticas`.

## Consequências
- Segredos novos na Vercel: `BOT_APP_ID`, `BOT_APP_SEGREDO`, `BOT_TENANT_ID`, `PROCESSADOR_SEGREDO`
  (`docs/segredos.md`). Sem eles, nada é enviado e os avisos esperam como `pendente`.
- O segredo do App Registration do bot **vence** (máx. 24 meses): anotar a data.
- Aviso chega em até ~1 minuto (o ciclo do `pg_cron`).
- "Abrir chamado pelo Teams" (Fase 3) continua possível: a rota `/bot/mensagens` já recebe as mensagens.
- Passo a passo de instalação: `docs/runbooks/bot-teams.md`.
