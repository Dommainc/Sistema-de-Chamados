# ADR 0021 — Prazo pausado enquanto aguarda o solicitante

**Status:** aceito · **Data:** 2026-10-29 · **Atualiza:** [ADR 0009](0009-prazo-definido-pela-ti.md) (prazo definido
pela TI) e [ADR 0011](0011-regras-de-atendimento-e-automacoes.md) (aguardando usuário é automático)

## Contexto
Na revisão do layout (ata de 26/10/2026 e mockup "Kanban") o dono decidiu que o prazo **não corre** enquanto o
chamado espera a resposta do solicitante: a coluna "Aguardando solicitante" mostra **"Prazo pausado"** e o cartão
**"Pausado há 3h"**. Sem isso, o técnico ficava "atrasado" por um tempo que não dependia dele, e o "% concluído no
prazo" do Dashboard e do resumo mensal punia a espera.

## Decisão
- **Ao entrar** em `aguardando_usuario` (só automático, 2 h úteis — ADR 0011), o gatilho
  `app.chamados_antes_atualizar` marca `chamados.sla_pausado_em = now()`.
- **Ao sair** (o solicitante responde; a TI conclui, transfere ou cancela; ou a conclusão automática das 48 h —
  ADR 0019), o prazo **anda para frente pelo tempo que ficou parado** (tempo corrido, não horas úteis),
  `sla_pausado_total` soma a espera e `sla_pausado_em` volta a nulo.
- Se havia prazo e a pausa foi de 1 minuto ou mais: `historico.acao = 'prazo_ajustado'` (**público**, sem autor,
  `detalhe`: `prazo`, `prazo_anterior`, `pausa_minutos`). O solicitante vê "Previsão de conclusão ajustada para …".
  **Sem aviso no Teams** (quem saiu da espera foi ele mesmo, ou o chamado acabou).
- Se a TI muda o prazo **durante** a espera, a pausa recomeça a contar a partir da mudança (o prazo novo já
  considera a espera até ali).
- Fica no banco (gatilho), não na API: vale para todos os caminhos, inclusive o `pg_cron`. A versão simulada tem o
  espelho em `apps/web/lib/dados/simulada/pausa.ts`.
- Colunas `sla_pausado_em` e `sla_pausado_total` já existiam (reservadas na base). As views `chamados_quadro` e
  `chamados_encerrados` ganham `sla_pausado_em`.

## Consequências
- "Atrasado" não vale para chamado em Aguardando: o quadro, os contadores e o Dashboard ("vencidos agora")
  ignoram os pausados; o topo do chamado mostra "Prazo do chamado: pausado".
- "% concluído no prazo" (Dashboard e resumo mensal) fica justo sem mudar a conta: o `prazo_sla` já foi empurrado.
- A coluna da TI passa a se chamar **"Aguardando solicitante"** também no status (antes "Aguardando usuário").
- Ordem de deploy (P-047): `npx supabase@latest db push` **antes** do site — o front lê `sla_pausado_em` das views.
