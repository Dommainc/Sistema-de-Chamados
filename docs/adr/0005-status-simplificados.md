# ADR 0005 — Status simplificados (6 em vez de 8)

**Status:** aceito · **Data:** 2026-10-05 · **Substitui:** a máquina de estados original do `CLAUDE.md` e do `docs/escopo.md`

## Decisão
O chamado passa a ter 6 status:

| Status | Significado |
|---|---|
| `pendente` | Chegou ou voltou para a fila. **Sem responsável.** |
| `em_andamento` | Um técnico assumiu. |
| `aguardando_usuario` | O técnico espera resposta do solicitante (SLA pausa na Fase 2). |
| `transferido` | Passou para outro técnico, que ainda não assumiu. Responsável = técnico de destino. |
| `concluido` | Final. O técnico concluiu. Somente leitura. |
| `cancelado` | Final. Cancelado com motivo. Somente leitura. |

Saem: `aberto` e `em_analise` (viram `pendente`), `resolvido` e `fechado` (viram `concluido`).

Regras decididas pelo dono do projeto:
1. **Concluído é definitivo.** Não existe confirmação nem reabertura pelo solicitante. Se o problema voltar, ele abre um
   novo chamado (a tela oferece "Abrir novo pedido" citando o número anterior).
2. **Sem fechamento automático.** O técnico conclui manualmente, inclusive a partir de `aguardando_usuario` quando
   o solicitante não responde.
3. **Resposta do solicitante** em `aguardando_usuario` volta o chamado sozinho para `em_andamento`.
4. **Devolver à fila** (`pendente`) limpa o responsável; o histórico guarda quem devolveu e o motivo.
5. **Transferido parado:** qualquer técnico pode devolver à fila. Só o técnico de destino assume direto.
   Um alerta para transferido parado fica para a Fase 2.
6. **Técnico também abre chamado** (vê o formulário de abertura).
7. **Concluir não grava mensagem automática** no chat.

A tabela de transições oficial está no `CLAUDE.md`.

> **Atualizado pelo [ADR 0011](0011-regras-de-atendimento-e-automacoes.md) (2026-10-07):** só a TI cancela; a TI só
> conversa depois de iniciar; volta um job agendado, para as automações por tempo (2 h úteis → aguardando usuário;
> 24 h úteis → aviso no chat). Nada é encerrado automaticamente.

## Motivos
- Menos status = mais fácil para quem abre e para quem atende entender em que pé está o pedido.
- Sem etapa de confirmação, o técnico controla o encerramento e não depende de job agendado.

## Consequências
- **Migration nova** (a 0001–0014 não são editadas): trocar o enum `status_chamado`, ajustar checks
  (`em_andamento` exige responsável; `pendente` sem responsável; cancelado exige motivo), trocar `resolvido_em`/`fechado_em`
  por `concluido_em`, atualizar trigger de carimbos e índices parciais, remover o job de fechamento automático (0014)
  e a configuração `dias_fechamento_automatico`, e ajustar os testes pgTAP.
- Rótulos para o solicitante: Pendente · Em andamento · **Aguardando sua resposta** · Em andamento (para transferido) ·
  Concluído · Cancelado.
- Docs antigos (`escopo.md`, `1B`, `1C`, `1D`) citam os status antigos: valem este ADR e o `CLAUDE.md`.
- Some o cartão "Deu certo? Sim / Não" da nova 1A-3; a barra de progresso vira Pendente → Em andamento → Concluído.
