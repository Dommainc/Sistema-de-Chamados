# Etapa 1C — Chat em tempo real e anexos (inclui Ctrl+V)

> ⚠️ **Não é mais uma etapa.** Absorvida pela `1A-3-experiencia-por-perfil.md`; use só como referência de API, banco e erros.
> Status, confirmar/reabrir e fechamento automático aqui estão desatualizados: valem `docs/adr/0005` e o `CLAUDE.md`.

## Objetivo
Conversa entre solicitante e TI dentro do chamado, com mensagens internas, anexos e prints colados.

## Escopo — API
1. `POST /chamados/{id}/mensagens` `{ conteudo, interna, anexos: [ids_pendentes] }`
   - Precisa de texto **ou** anexo. Chamado encerrado → `TRANSICAO_INVALIDA`.
   - `interna = true` só para TI.
   - Se o autor é o solicitante e o status é `aguardando_usuario` → transição automática para `em_atendimento` (historico + notificação).
   - Mensagem não interna gera notificação `nova_mensagem` para a outra parte (solicitante ↔ responsável; sem responsável → TI).
2. **Anexos** (ver CLAUDE.md, seção Anexos). O arquivo sobe **antes** de existir a mensagem (ou o chamado, na abertura):
   - `POST /anexos/upload-url` `{ nome, mime, tamanho, origem }` → valida contra
     `configuracoes.anexo_tamanho_max_mb` e `anexo_tipos_permitidos` (`ANEXO_MUITO_GRANDE`, `ANEXO_TIPO_INVALIDO`)
     → devolve `{ upload_id, url_assinada }` para o path temporário `temporarios/{usuario_id}/{uuid}-{nome}`
     (Storage `createSignedUploadUrl`, via `service_role`). Usuários não leem `temporarios/` (sem policy).
   - `POST /chamados` (1B) e `POST /chamados/{id}/mensagens` aceitam `anexos: [upload_id]`. Na mesma ação a API confere
     no Storage se o objeto existe e se tamanho/tipo reais batem, **move** para `chamados/{id}/{uuid}-{nome}` e grava em
     `anexos` (`mensagem_id` nulo na abertura). Falha → `UPLOAD_FALHOU`; o upload_id precisa ser do próprio usuário.
   - `GET /anexos/{id}/url` → URL assinada de download (60 s), só se o usuário lê o registro sob RLS.
   - Limpeza: apagar `temporarios/` com mais de 24 h (pode rodar no cron da 1E).

## Escopo — Web
1. **Chat** em `/chamados/[id]`:
   - Lista de mensagens + assinatura Supabase Realtime (`postgres_changes` em `mensagens` filtrado por `chamado_id`).
   - Mensagem interna com destaque visual (fundo âmbar + etiqueta "Interna — só a TI vê"); toggle "Mensagem interna" só para TI.
   - Envio otimista; falha → `MENSAGEM_NAO_ENVIADA` com "Toque para tentar de novo", **mantendo o texto**.
   - Realtime caiu/offline → faixa `SEM_CONEXAO`; ao reconectar, recarrega as mensagens perdidas.
   - Status e histórico também atualizam em tempo real (`chamados`, `historico`).
2. **Componente `SeletorAnexos`** (usado no chat **e** no formulário de abertura da 1B):
   - Botão + arrastar-e-soltar.
   - **Colar imagem (Ctrl+V / Cmd+V)**: evento `paste` no campo de texto e na área do formulário; ler `clipboardData.items`,
     aceitar `image/*`; nome `print-AAAAMMDD-HHMMSS.png`; `origem = 'colado'`; várias imagens seguidas funcionam
     (sufixo `-2`, `-3` se cair no mesmo segundo). Colar sem imagem quando o usuário usou o atalho do anexo → `COLAR_SEM_IMAGEM`
     (não disparar ao colar texto comum no campo de mensagem).
   - Pré-visualização (miniatura para imagem, ícone + nome para outros) com remover antes de enviar.
   - Validação de tamanho/tipo no front antes de pedir a URL (mesmas mensagens da API).
   - Barra de progresso do upload.
3. Anexos aparecem dentro da mensagem (miniatura clicável abre em tamanho real) e numa lista "Arquivos do chamado".

## Critérios de aceite
- Ana e Técnico em duas janelas: mensagens aparecem sem recarregar.
- Ana não recebe (nem via Realtime) mensagens internas, nem consegue baixar anexo de mensagem interna.
- Print com Win+Shift+S → Ctrl+V aparece no chat e no formulário de abertura.
- Arquivo de 11 MB e `.exe` são recusados com as mensagens corretas, no front e direto na API.
- Ana responde em `aguardando_usuario` → status volta para `em_atendimento` sozinho.
