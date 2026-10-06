# Runbook — restaurar backup do banco

> Requisito de go-live: **testar este procedimento no projeto `dev` antes de entrar em produção** (docs/escopo.md, seção 10).

## Quando usar
Dados apagados ou corrompidos por engano, migration com problema em produção, incidente de segurança.

## Antes de tudo
1. Avise a equipe: a Central ficará **somente leitura** ou fora do ar durante a restauração.
2. Anote o **horário exato** do problema (o ponto para o qual voltar).
3. Se for incidente de segurança, troque as chaves depois ([rotacionar-chave.md](rotacionar-chave.md)).

## Opção A — Point-in-Time Recovery (PITR, se contratado no plano)
1. Painel Supabase → projeto `prod` → **Database → Backups → Point in time**.
2. Escolha o horário **um pouco antes** do problema e confirme.
3. Aguarde o término (o painel mostra o andamento). O projeto reinicia.

## Opção B — Backup diário
1. Painel Supabase → **Database → Backups → Scheduled backups**.
2. Escolha o backup do dia anterior ao problema → **Restore**.
3. Atenção: tudo o que aconteceu **depois** desse backup se perde (chamados e mensagens do dia).

## Depois de restaurar
1. Conferir: `select max(id) from chamados;` e alguns chamados recentes pela tela da TI.
2. Conferir o Storage: anexos não voltam junto com o banco — anexos de chamados restaurados podem ter sumido
   ou sobrado; registrar os casos.
3. Reprocessar avisos pendentes: chamar o cron da API (ou aguardar 5 minutos).
4. Registrar o ocorrido em `docs/pendencias.md` e avisar a equipe que a Central voltou.

## Teste periódico (no `dev`)
- [ ] Restaurar o backup mais recente do `dev` num projeto temporário e abrir a Central contra ele.
- [ ] Anotar aqui a data do último teste: ______
