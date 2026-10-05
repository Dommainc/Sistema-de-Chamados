# Etapa 1B — Chamados: abertura, formulário dinâmico e máquina de estados

> ⚠️ **Não é mais uma etapa.** Absorvida pela `1A-3-experiencia-por-perfil.md`; use só como referência de API, banco e erros.
> Status, confirmar/reabrir e fechamento automático aqui estão desatualizados: valem `docs/adr/0005` e o `CLAUDE.md`.

## Objetivo
Solicitante abre chamado pelo formulário da categoria e recebe número e prazo. Todas as transições
de status funcionam pela API, com histórico e notificação pendente.

## Escopo — API
1. **`app/dominio/estados.py`**: máquina de estados exatamente como a tabela do CLAUDE.md
   (transição, papel autorizado, exigências). Função pura `validar_transicao(chamado, para, usuario, dados)`
   que levanta `TRANSICAO_INVALIDA`, `MOTIVO_OBRIGATORIO`, `CANCELAMENTO_NAO_PERMITIDO` ou `SEM_PERMISSAO`.
   Testes cobrindo **todas** as linhas da tabela e transições proibidas.
2. **`app/dominio/formulario.py`**: valida `respostas_form` contra `campos_form` ativos da categoria
   (obrigatório, tipo, opção válida). Erros por campo → `CAMPO_OBRIGATORIO` com `{campo}` = label.
3. **Rotas** (todas numa transação: lê como usuário, grava como `central_api`, grava `historico` + `notificacoes`):
   - `POST /chamados` → `{ id, prazo_sla }`. Notificação `chamado_aberto` para o solicitante e para cada membro ativo da TI.
   - `POST /chamados/{id}/assumir`
   - `POST /chamados/{id}/transferir` `{ para_responsavel_id | null, motivo }` (null = devolver à fila → `em_analise`); grava `transferencias`.
   - `POST /chamados/{id}/status` `{ para }` (em_analise, aguardando_usuario, resolvido)
   - `POST /chamados/{id}/cancelar` `{ motivo }`
   - `POST /chamados/{id}/confirmar` (resolvido → fechado) e `POST /chamados/{id}/reabrir` `{ motivo }`
   - Chamado que o usuário não pode ver → `SEM_PERMISSAO` (403); número inexistente para TI → `CHAMADO_NAO_ENCONTRADO` (404).
     Para solicitante, número inexistente e número de outra pessoa retornam **o mesmo** `SEM_PERMISSAO` (não revelar quais existem).
   - `historico.publico = false` para detalhes internos (motivo de transferência entre técnicos); o solicitante vê só "Chamado transferido".
4. **Tipos de notificação**: `chamado_aberto`, `chamado_assumido`, `chamado_transferido`, `status_alterado`. O payload leva
   número, título, status de/para e link `/chamados/{id}`. Só grava como `pendente` (envio é na 1E).

## Escopo — Web
1. **`/chamados/novo`**: escolher categoria (cards com nome e descrição) → formulário montado de `campos_form`
   (texto, texto_longo, numero, data, selecao, multipla_selecao, sim_nao) + título. Validação inline.
   Ao enviar: tela de sucesso "Chamado #42 aberto" + prazo ("Previsão de atendimento até 06/10 às 11:00") + botão "Acompanhar".
   Deixar o espaço de anexos preparado e `POST /chamados` já aceitando `anexos: []` (implementado na 1C).
2. **`/chamados`** (Meus chamados): lista com número, título, status (badge), data e prazo. Filtro "Em andamento / Encerrados".
3. **`/chamados/[id]`**: cabeçalho (número, título, status, categoria, responsável, prazo), respostas do formulário,
   linha do tempo do histórico (só público para solicitante), ações conforme papel e status:
   - solicitante: Cancelar (com modal de motivo, só em aberto/em_analise), Confirmar solução, Reabrir.
   - TI: Assumir, Transferir (modal: técnico ou "devolver à fila" + motivo), Aguardar usuário, Resolver, Cancelar.
   Botões só aparecem quando a transição é permitida (mesma regra da API, exposta por `GET /chamados/{id}/acoes`).
   Título da aba: "Chamado #42 — Central de Chamados".
4. Chat fica como área reservada (1C).

## Critérios de aceite
- Fluxo completo com usuários dev: Ana abre → Técnico assume → transfere → resolve → Ana confirma.
- Ana cancela antes do atendimento; depois de assumido, recebe `CANCELAMENTO_NAO_PERMITIDO`.
- `/chamados/{n}` de outra pessoa → tela "Você não tem acesso a este chamado".
- Testes de API para cada rota, incluindo chamadas diretas com o token de outro usuário.
- Cada passo aparece no histórico e gera linha em `notificacoes`.
