# ADR 0022 — Configurações pela tela da TI

**Status:** aceito · **Data:** 2026-11-06 · **Resolve:** P-008 (Configurações na Fase 2)

## Contexto
Até a Fase 1, tudo o que molda o formulário e a contagem de tempo (sistemas, módulos, itens, assuntos, respostas
prontas, feriados e expediente) só mudava por migration ou SQL. A cada sistema novo da empresa era preciso uma
migration (ex.: 0030, 0036). O dono pediu um painel para a própria TI fazer isso.

## Decisão
- Tela **`/atendimento/painel`** (menu do nome → **Painel**; nome trocado pelo dono em 2026-11-09), com quatro abas: **Formulários**,
  **Assuntos**, **Respostas prontas** e **Feriados e expediente**, e o quadro **"Últimas alterações"**.
- **Quem:** qualquer pessoa da TI (`docs/escopo.md`: toda a TI tem o mesmo acesso). Solicitante não vê a tela e a
  API recusa (`SEM_PERMISSAO`).
- **Leitura direta, gravação pela API** (ADR 0002): o front lê do Supabase (RLS: a TI vê também os desativados);
  as rotas `PATCH/POST /configuracoes/...` conferem `app.eh_ti()` lendo como o usuário e gravam como `central_api`,
  com a linha de `config_alteracoes` na **mesma transação**.
- **Nada é apagado:** assunto, resposta pronta e feriado são **desativados** (somem dos formulários/chat/contagem,
  continuam no banco). Opção sai da lista do formulário; chamados antigos guardam o texto escolhido na época.
- **Renomear não reescreve chamados antigos** (`respostas_form` fica como estava). Consequência aceita: no filtro do
  quadro e no Excel o nome antigo e o novo aparecem separados.
- **Perguntas dependentes seguem a opção:** renomear Sienge/CVCRM atualiza o `mostrar_se` do módulo na mesma
  transação; **tirar** uma opção que abre pergunta é recusado (`OPCAO_COM_PERGUNTAS`).
- **Cores:** paleta fixa (25); repetir cor é permitido (melhor que travar o cadastro de um sistema novo). Só as
  perguntas que já têm cores (hoje, "Qual sistema?") mostram o seletor.
- **Assunto novo** nasce com a pergunta "Descreva o que está acontecendo" (igual ao seed). Perguntas novas (campos)
  continuam por migration — fora do escopo desta tela.
- **Expediente** (`configuracoes.expediente_inicio/fim`) vale na hora para prazos, Dashboard e automações, que já
  liam a configuração a cada execução.
- **Registro:** tabela nova `config_alteracoes` (área, resumo pronto para a tela, `detalhe` antes/depois, autor,
  data). Só inserção, pela API; a TI lê.
- Erros novos no catálogo: `NOME_DUPLICADO`, `OPCOES_VAZIAS`, `OPCAO_COM_PERGUNTAS`, `EXPEDIENTE_INVALIDO`,
  `FERIADO_DUPLICADO`.

## Consequências
- Migration 0037 (`20261106120000_configuracoes_pela_tela.sql`): `config_alteracoes` (RLS + GRANT + policy) e
  `respostas_prontas` gravável pela API; a TI lê as desativadas (o chat passa a filtrar `ativo = true`). pgTAP 022;
  o 010 foi ajustado.
- Sistema novo, módulo novo ou feriado de 2028 não precisam mais de migration. O `seed.sql` continua sendo só o
  ponto de partida de um banco novo.
- A versão simulada guarda a configuração no estado do navegador (`lib/dados/simulada/configuracoes.ts`) com as
  mesmas regras (`lib/dominio/configuracoes.ts` ↔ `apps/api/app/dominio/configuracoes.py`).
