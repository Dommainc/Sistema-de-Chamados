# Pré-revisão da Fase 1 — o que está pronto e o que falta para ir ao ar

**Data:** 2026-10-07 · Base: critérios de pronto (`docs/escopo.md`, seção 13) e etapa `1F-fechamento.md`.
Atualize este arquivo quando um item mudar (e registre no `STATUS.md`).

## Resumo em uma frase
O sistema está **construído e testado de ponta a ponta no modo de demonstração**, e a API e o banco já rodam contra
um banco de verdade no CI. Para ir ao ar faltam **três coisas de fora** — a **assinatura do Supabase**, o **cadastro do
app no Microsoft (Entra)** e o **acesso ao bot do Teams** — e **duas de construção**: a ligação das telas com o banco
real (camada `real`) e os avisos no Teams (etapa 1E).

## Critérios de pronto (escopo, seção 13)

Legenda: ✅ pronto e testado · 🟡 pronto em parte · ⏳ depende de algo externo

| # | Critério | Situação | Evidência | O que falta / depende de |
|---|---|---|---|---|
| 1 | Usuário entra com a conta Microsoft, abre um chamado e recebe o número e o aviso no Teams | 🟡 | Abrir chamado e receber o número: E2E `fluxos.spec.ts` ("Ana abre um chamado colando um print…") e integração da API (`test_chamados_banco.py`). O aviso já é gravado como pendente (`notificacoes`) | Login Microsoft de verdade (**Entra**), camada `real` do front e envio pelo **bot** (1E) |
| 2 | Abrir o chamado de outra pessoa pela URL retorna `SEM_PERMISSAO` | ✅ | E2E "abrir o chamado de outra pessoa pela URL mostra 'sem acesso'"; API `tests/rotas` (Ana no chamado do Bruno) | Repetir no ambiente real no teste final do go-live |
| 3 | Técnico assume, conversa, transfere (com motivo) e conclui; cada passo no histórico e com aviso | ✅ | E2E "técnico assume, conversa, anota no relato técnico, transfere…"; API (rotas + integração com banco real); pgTAP 001/002 | Envio do aviso pelo bot (1E). *Escopo dizia "resolve": desde o ADR 0005 é "conclui"* |
| 4 | Solicitante cancela antes do atendimento (com motivo) e não consegue depois | ✅ | E2E "Ana cancela antes do atendimento e não consegue cancelar depois"; API `CANCELAMENTO_NAO_PERMITIDO` | — |
| 5 | Print colado com Ctrl+V aparece no chat e no formulário de abertura | ✅ | E2E (colar print na abertura); testes de tela do chat e do formulário; integração: upload assinado → mover → baixar no Storage real | — |
| 6 | Responder ao bot no Teams gera a resposta automática com o link do chamado | ⏳ | — | Etapa **1E** (por último, decisão do dono) + acesso ao código do bot |
| 7 | Todos os erros da seção 8 aparecem com a mensagem amigável correta | 🟡 | Ver tabela abaixo: 14 de 15 códigos com teste de **exibição** | `SESSAO_EXPIRADA` só existe com login real (camada `real`) |
| 8 | Um usuário não vê o chamado de outro (testado direto via API) | ✅ | API `tests/rotas` (todas as rotas); integração no CI lendo o **PostgREST com a anon key** (Bruno não vê o chamado da Ana); pgTAP 001 (RLS) e 005 (inativo) | — |
| 9 | Projeto Supabase de produção confirmado em `sa-east-1` | ⏳ | Roteiro em `docs/go-live.md`, passo 1 | **Assinatura do Supabase** |

**Conta:** 5 prontos · 2 em parte · 2 dependendo de fora.

## Erros (seção 8) — cada código e onde é testado

| Código | Exibição testada | Onde |
|---|---|---|
| `CAMPO_OBRIGATORIO` | ✅ abaixo do campo | E2E erros; `FormularioChamado.test` |
| `ANEXO_MUITO_GRANDE` · `ANEXO_TIPO_INVALIDO` | ✅ | E2E erros; API (tamanho **real** do arquivo) |
| `COLAR_SEM_IMAGEM` | ✅ | `FormularioChamado.test` |
| `UPLOAD_FALHOU` | ✅ | `FormularioChamado.test` (Storage fora do ar — novo nesta revisão); API |
| `SESSAO_EXPIRADA` | ⏳ | Só API (`test_auth`). No front aparece com o login real |
| `SEM_PERMISSAO` · `CHAMADO_NAO_ENCONTRADO` | ✅ | E2E "sem acesso"; telas e API |
| `TRANSICAO_INVALIDA` · `MOTIVO_OBRIGATORIO` · `CANCELAMENTO_NAO_PERMITIDO` | ✅ | Quadro (arrastar inválido), modais, E2E cancelar; API |
| `PRAZO_INVALIDO` | ✅ | Janela de prazo; API |
| `MENSAGEM_NAO_ENVIADA` · `SEM_CONEXAO` | ✅ | E2E erros (sem internet → "toque para tentar de novo" → reenvia) |
| `ERRO_INESPERADO` | ✅ | `app/error.test.tsx` (mensagem com `ERR-XXXX`, sem texto técnico — novo nesta revisão); API (`ref`) |

## Etapa 1F — o que ela pede

| Item | Situação |
|---|---|
| 1. Teste de exibição de cada erro + revisão manual (nenhuma mensagem técnica) | 🟡 14/15 com teste; revisão manual no ambiente real |
| 2. Segurança via API (token da Ana em todas as rotas do chamado do Bruno) e direto no PostgREST | ✅ (rotas + integração no CI) |
| 3. E2E dos itens da seção 13 | ✅ no modo de demonstração (16 testes, computador e celular). Repetir no ambiente real |
| 4. Documentação completa + guia de 1 página com prints | ✅ `docs/` e `guia-usuario.md` atualizados a cada mudança |
| 5. Checklist de go-live | ✅ `docs/go-live.md` (10 passos, com "como conferir") |

## O que falta, por quem depende

### Depende de fora
| O quê | De quem | Destrava |
|---|---|---|
| Assinatura do Supabase (P-022) | Diretoria | Projetos `dev`/`prod`, camada `real`, critério 9 |
| App Registration no Entra + grupo **Central-Chamados-TI** | TI / admin do Microsoft 365 | Login Microsoft, papel da TI, critério 1 |
| Acesso ao código do bot do Teams | Quem mantém o bot | Etapa 1E, critérios 1 e 6 |

### Construção (com o que já temos)
| O quê | Observação |
|---|---|
| **Camada `real` do front** | Ligar as telas ao Supabase e à API. Pode ser feita e testada no CI antes da assinatura |
| **1E — Avisos no Teams** | Por último. Lê `notificacoes` pendentes e envia pelo bot; resposta automática |
| Testes de navegador no CI (P-031) | Hoje rodam só na máquina |
| Dia do go-live | Seguir `docs/go-live.md`; teste final com pessoas de verdade; **testar uma restauração de backup** |

### Pequenas pendências abertas
P-027 (salvar o PDF do mockup no repositório) · P-032 (confirmar a API na Vercel no 1º deploy) ·
P-035 (desligar login por e-mail na nuvem) · P-036 (versões das ações do CI) · P-033 (atalho do `uv`).

## Ordem sugerida até o go-live
1. **Camada `real`** do front, testada no CI (não depende de ninguém).
2. Quando o **Supabase** for assinado: `go-live.md` passos 1–6 no `dev`.
3. Quando o **Entra** existir: passo 5 (login) e teste com contas reais da DOMMA.
4. **1E** com o bot do Teams.
5. `prod` + teste final + restauração de backup testada → **no ar**.
