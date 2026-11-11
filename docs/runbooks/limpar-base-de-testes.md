# Runbook — limpar a base antes de uma rodada de testes

Apaga **todos os chamados** e o que depende deles (conversas, histórico, anexos registrados, avisos do Teams,
avaliações, leituras) e faz a numeração **voltar para o #1**. Usado em 2026-11-11, antes dos testes com outros
usuários.

**Não apaga:** pessoas (`profiles`, com o departamento já informado), o que foi mudado no **Painel** (assuntos,
sistemas, respostas prontas, feriados, expediente e o registro "Últimas alterações"), configurações e as conversas
do bot (`teams_conversas` — ninguém precisa reinstalar o app do Teams).

> ⚠️ **Não tem volta.** O plano Free não tem backup (P-046). Só rode no projeto que está em teste, nunca em produção
> com chamados de verdade.

## 1. Banco (Supabase → SQL Editor)

Projeto certo selecionado → **SQL Editor** → **New query** → colar e **Run**:

```sql
begin;

-- O bot guarda o último chamado avisado de cada pessoa: solta a referência (a conversa continua).
update public.teams_conversas set ultimo_chamado_notificado = null;

-- Tudo o que depende dos chamados (nenhuma outra tabela aponta para estas).
truncate table
  public.bot_respostas_automaticas,
  public.notificacoes,
  public.avaliacoes,
  public.chamado_leituras,
  public.anexos,
  public.mensagens,
  public.transferencias,
  public.historico
restart identity;

-- Chamados: o banco proíbe apagar (CC003). Desliga a trava só durante esta limpeza.
alter table public.chamados disable trigger chamados_bloquear_exclusao;
delete from public.chamados;
alter table public.chamados enable trigger chamados_bloquear_exclusao;

-- Próximo chamado volta a ser o #1.
alter table public.chamados alter column id restart with 1;

commit;
```

Se der qualquer erro, nada é apagado (está tudo dentro do `begin … commit`).

**Conferir** (tudo tem que dar 0, e a trava tem que estar ligada de novo):

```sql
select (select count(*) from public.chamados)     as chamados,
       (select count(*) from public.mensagens)    as mensagens,
       (select count(*) from public.historico)    as historico,
       (select count(*) from public.notificacoes) as avisos,
       (select tgenabled from pg_trigger where tgname = 'chamados_bloquear_exclusao') as trava; -- 'O' = ligada
```

## 2. Arquivos (Supabase → Storage)

O SQL não apaga os arquivos (o Supabase não deixa). **Storage** → bucket **`anexos`** → selecione as pastas
**`chamados`** e **`temporarios`** → **Delete**. As pastas voltam sozinhas quando alguém anexar de novo.

## 3. Depois

- Abrir a Central como TI: o quadro aparece vazio; o primeiro chamado aberto vira o **#1**.
- No modo de demonstração (navegador), o botão **"Restaurar dados de exemplo"** faz o equivalente só para quem
  está usando o demo.
