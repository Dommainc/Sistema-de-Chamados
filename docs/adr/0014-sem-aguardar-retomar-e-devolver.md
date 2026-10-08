# ADR 0014 — Sem "aguardar usuário", "retomar" e "devolver à fila"

**Status:** aceito · **Data:** 2026-10-08 · **Atualiza:** [ADR 0005](0005-status-simplificados.md) (transições) e
[ADR 0011](0011-regras-de-atendimento-e-automacoes.md) (aguardando usuário só automático)

## Contexto
Na revisão da área da TI, o dono pediu que as ações do chamado fossem só **Concluir · Transferir · Cancelar chamado**
e escolheu tirar "Devolver à fila" e "Aguardar usuário" **do sistema todo** (não só da tela). Com isso "Retomar
atendimento" perde o sentido. Na mesma revisão: expediente **8h–20h**, sem "Iniciar" no cartão (iniciar dentro do
chamado ou arrastando de Novos para Em atendimento) e sem "Próximo da fila".

## Decisão
- Saem as ações `aguardar_usuario`, `retomar` e `devolver_fila` da máquina de estados (`estados.py` e `estados.ts`),
  as rotas `POST /chamados/{id}/aguardar`, `/retomar` e `/devolver`, os botões, o menu "⋯ Mais ações" e os arrastes
  correspondentes no quadro.
- **Aguardando usuário é só automático**: entra por `app.processar_inatividade()` (2 h úteis sem resposta à mensagem
  da TI) e sai quando o solicitante responde no chat (`resposta_solicitante`). De lá, a TI pode concluir, transferir
  ou cancelar.
- **Transferido para outro técnico**: quem não é o destino só pode **cancelar** (antes podia devolver à fila).
- O banco não muda: os status continuam os mesmos seis; eventos antigos `devolvido_fila` seguem no histórico.
- **Expediente 8h–20h** (`configuracoes.expediente_fim = 20:00` no seed): vale para as automações (2 h e 24 h úteis)
  e para os tempos do Dashboard (ADR 0013).
- **Bot do Teams (1E):** quando o chamado for sozinho para Aguardando usuário, o aviso ao solicitante precisa dizer o
  porquê (está esperando a resposta dele há 2 h úteis). As notificações já ficam como `pendente` (ADR 0003).

## Transições (substitui a tabela do ADR 0005)
| De | Para | Quem | Exige |
|---|---|---|---|
| pendente | em_andamento | TI (iniciar) | responsável = quem iniciou |
| pendente | cancelado | TI | motivo |
| em_andamento | aguardando_usuario | **só automático** (2 h úteis sem resposta) | — |
| aguardando_usuario | em_andamento | solicitante responde no chat (automático) | — |
| em_andamento, aguardando_usuario | transferido | TI | técnico de destino + motivo |
| transferido | em_andamento | técnico de destino (iniciar) | — |
| em_andamento, aguardando_usuario | concluido | TI | — |
| em_andamento, aguardando_usuario, transferido | cancelado | TI | motivo |
| concluido, cancelado | — | ninguém | terminal |

## Consequências
- Menos botões e menos dúvida para os analistas; o quadro reflete só o que aconteceu de fato.
- Chamado iniciado por engano não volta para a fila: o técnico transfere para um colega ou cancela com motivo.
