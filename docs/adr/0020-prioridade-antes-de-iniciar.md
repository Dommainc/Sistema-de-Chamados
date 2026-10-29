# ADR 0020 — Prioridade já na triagem (antes de iniciar)

**Status:** aceito · **Data:** 2026-10-29 · **Atualiza:** [ADR 0012](0012-prioridade-e-chamado-nao-iniciado.md)
(prioridade só depois de iniciar)

## Contexto
No ADR 0012 a prioridade ficava travada até alguém iniciar o chamado, junto com a conversa e o prazo. Com o quadro
novo (layout da ata de 26/10/2026), a coluna **Novos** virou a triagem: o dono pediu para a TI poder marcar
**Alta · Média · Baixa** ali mesmo, antes de alguém pegar o chamado, para o que é urgente subir no quadro.

## Decisão
- A TI define a prioridade em `pendente` e `transferido` também (`POST /chamados/{id}/prioridade`). Continua: só a
  TI, nunca em chamado encerrado (`TRANSICAO_INVALIDA`), histórico **interno** (`prioridade_alterada`, `publico =
  false`), sem aviso ao solicitante.
- **Continuam travados antes de iniciar** (ADR 0012): conversa, nota interna e prazo → `CHAMADO_NAO_INICIADO`.
- Na interface: o cartão, a Lista e o topo do chamado mostram a prioridade desde Novos; o filtro "Prioridade" do
  quadro inclui os Novos.
- O banco não muda: a regra estava só na API e na versão simulada.

## Consequências
- Todo chamado novo aparece como **Média** (o padrão) até alguém mudar.
- O técnico que abriu um chamado para si também pode mudar a prioridade dele (a prioridade não é atendimento); o
  que continua proibido é iniciar o próprio chamado (`CHAMADO_PROPRIO`).
