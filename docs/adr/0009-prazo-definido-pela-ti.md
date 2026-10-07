# ADR 0009 — Prazo do chamado definido pela TI (sem cálculo automático)

**Status:** aceito · **Data:** 2026-10-07 · **Substitui:** o prazo automático por categoria (`categorias.sla_horas`,
migrations 0005/0015) e a previsão antes de enviar (P-026)

## Contexto
Até aqui, o prazo de cada chamado era calculado na abertura: horas úteis da categoria (ex.: Internet = 2 h) a partir
do momento em que o chamado entrava. O dono do projeto decidiu que **o prazo não pode ser automático**: quem conhece
o problema é o técnico, e só ele define até quando prevê concluir.

## Decisão (respostas do dono, 2026-10-07)

| Ponto | Regra |
|---|---|
| Quando nasce | **Sem prazo** (`chamados.prazo_sla = null`). Nada é calculado pela categoria |
| Quem define | **Qualquer técnico ativo**, enquanto o chamado não estiver encerrado. É **opcional**. *Desde o [ADR 0012](0012-prioridade-e-chamado-nao-iniciado.md): só depois de iniciar* |
| Formato | **Data e hora** (fuso de São Paulo na tela; UTC no banco), sempre no futuro, até 1 ano |
| Alterar | Permitido, **com motivo obrigatório**. A 1ª definição não pede motivo |
| Registro | Cada definição grava `historico.acao = 'prazo_definido'` (`detalhe`: `prazo`, `prazo_anterior`, `motivo`), **público** |
| Aviso | O solicitante recebe `notificacoes.tipo = 'prazo_definido'` (pendente, pelo bot — ADR 0003) |
| Solicitante vê | Sim: "Previsão de conclusão: 08/10/2026 18:00"; se mudou, a nova data **e o motivo**. Sem prazo: "a TI vai informar" |
| Erro novo | `PRAZO_INVALIDO` — "Escolha uma data e hora no futuro para o prazo." (422) |

### Onde mora
- **Banco** — migration `20261007120000_prazo_definido_pela_ti.sql` (0019): o trigger de abertura grava `prazo_sla = null`.
  A coluna mantém o nome `prazo_sla`. `categorias.sla_horas` fica sem uso (reservado para a Fase 2).
- **API** — `POST /chamados/{id}/prazo` `{prazo, motivo?}`; sai `GET /categorias/{id}/previsao`.
- **Front** — cartão **PRAZO** da tela de atendimento: "Sem prazo" + **Definir prazo** / **Alterar prazo** (janela com
  atalhos Hoje 18h · Amanhã 12h · Amanhã 18h · Em 3 dias úteis, campo de data e hora e, ao alterar, o motivo).

### Ordem da fila e do quadro
Primeiro os chamados **com prazo**, do mais próximo ao mais distante; depois os **sem prazo**, do **mais antigo** ao
mais novo (`compararPrazo`, em `apps/web/lib/prazo.ts`). O "Próximo da fila" segue a mesma ordem. Sem prazo = cor
neutra (cinza) no canhoto e na barra; filtro "Sem prazo" no quadro.

## Consequências
- Chamado pode ficar em atendimento sem prazo. Se isso virar problema, um alerta "sem prazo há X horas" fica para a
  Fase 2 (junto com a pausa do prazo em "aguardando usuário").
- Os atalhos de "dias úteis" pulam só sábado e domingo; em feriado o técnico ajusta a data no campo.
- `app.adicionar_horas_uteis` continua no banco (testada no pgTAP), sem uso pelo chamado.
