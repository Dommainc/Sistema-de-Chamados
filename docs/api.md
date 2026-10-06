# API da Central de Chamados (`apps/api`)

FastAPI. Documentação interativa (gerada do código, sempre atualizada): **`/docs`** —
local em <http://localhost:8000/docs>. Este arquivo é o resumo para quem vai integrar (a camada `real` do front).

## Regras gerais

- **Só ações passam pela API.** Listas e telas (meus chamados, quadro, conversa, histórico) o front lê **direto do
  Supabase** com a anon key; o RLS filtra ([ADR 0002](adr/0002-modelo-leitura-escrita.md)).
- **Login:** cabeçalho `Authorization: Bearer <token do Supabase>` em todas as rotas, menos `/saude`
  ([ADR 0007](adr/0007-autenticacao-api.md)). Sem token, inválido ou vencido → `SESSAO_EXPIRADA` (401).
- **Perfil inativo** (desligado, ou e-mail fora de `@dommainc.com.br` — migration 0018) → `SEM_PERMISSAO` (403) em
  qualquer rota de chamado.
- **Uma transação por requisição:** chamado + histórico + aviso (`notificacoes`, `pendente`) gravam juntos ou nada
  grava. O aviso no Teams sai depois, pelo bot ([ADR 0003](adr/0003-notificacoes-outbox.md)); falha no Teams nunca
  bloqueia a ação.
- **Datas** em ISO 8601, UTC (`2026-10-06T15:00:00Z`). O front exibe em São Paulo.

## Formato dos erros

Sempre o mesmo corpo, com o texto do catálogo ([`docs/erros.md`](erros.md)), igual no front e na API:

```json
{
  "erro": {
    "codigo": "CAMPO_OBRIGATORIO",
    "mensagem": "Preencha o campo titulo para continuar.",
    "campos": [{ "campo": "titulo", "mensagem": "Preencha o campo titulo para continuar." }]
  }
}
```

- `campos` — só em erro de formulário (um item por campo, na ordem do formulário).
- `ref` — só em `ERRO_INESPERADO` (`ERR-7K2Q`): é o código que o usuário passa para a TI achar no log.
- `detalhe` — só com `AMBIENTE=dev`. **Nunca** em produção (sem SQL, stack trace ou mensagem crua).

| Código | HTTP | Quando |
|---|---|---|
| `SESSAO_EXPIRADA` | 401 | Token ausente, inválido ou vencido |
| `SEM_PERMISSAO` | 403 | Ação de TI feita por solicitante; chamado de outra pessoa; perfil inativo |
| `CHAMADO_NAO_ENCONTRADO` | 404 | Só para a TI. Para o solicitante, número inexistente também é `SEM_PERMISSAO` (não revela quais números existem) |
| `TRANSICAO_INVALIDA` | 409 | Ação que não vale no status atual; chamado encerrado (nada muda depois de concluído/cancelado) |
| `CANCELAMENTO_NAO_PERMITIDO` | 409 | Solicitante cancelando depois que a TI assumiu |
| `CAMPO_OBRIGATORIO` | 422 | Formulário incompleto; mensagem vazia; destino da transferência não é técnico ativo |
| `MOTIVO_OBRIGATORIO` | 422 | Cancelar, transferir, devolver ou alterar o prazo sem motivo |
| `PRAZO_INVALIDO` | 422 | Prazo no passado, a mais de 1 ano ou sem fuso |
| `ANEXO_MUITO_GRANDE` / `ANEXO_TIPO_INVALIDO` | 422 | Arquivo acima de 10 MB ou tipo não aceito (vale o tamanho **real** do arquivo enviado) |
| `UPLOAD_FALHOU` | 502 | Storage fora do ar; arquivo não chegou; upload de outra pessoa |
| `ERRO_INESPERADO` | 500 | Qualquer outra coisa (com `ref`) |

## Rotas

### Sistema e perfil

| Rota | Quem | O que faz |
|---|---|---|
| `GET /saude` | todos (sem login) | `{status, versao, ambiente, banco}` — usado no monitoramento |
| `GET /me` | logado | Meu perfil: `id, nome, email, departamento, telefone, papel, ativo, cadastro_pendente` |
| `PATCH /me` | logado | Atualiza `departamento` e `telefone` (primeiro acesso). O papel **nunca** muda por aqui |
| `POST /auth/sincronizar` | logado | Logo após o login: define o papel pelo grupo `Central-Chamados-TI` do Entra ([ADR 0004](adr/0004-papeis-entra-id.md)) |

### Abrir chamado

O chamado nasce **sem prazo** (`prazo_sla: null`): quem define é a TI ([ADR 0009](adr/0009-prazo-definido-pela-ti.md)).

**1. Anexos (opcional, um por arquivo)** — `POST /anexos/upload-url`

```json
{ "nome": "print-20261006-090000.png", "mime": "image/png", "tamanho": 48213 }
```
→ `{"upload_id": "temporarios/<meu id>/<uuid>-print-20261006-090000.png", "url": "<URL assinada>"}`.
O navegador envia o arquivo **direto** para a `url` (`PUT`, corpo = arquivo, `Content-Type` = mime), sem passar pela
API (limite de 4,5 MB da Vercel).

**2. Enviar** — `POST /chamados` → **201**

```json
{
  "categoria_id": 2,
  "titulo": "Sem internet na obra",
  "respostas": { "alcance": "Só eu", "local": "Obra Recreio", "descricao": "Roteador piscando" },
  "anexos": [{ "upload_id": "temporarios/...", "nome": "print-20261006-090000.png", "origem": "colado" }]
}
```
→ `{id, titulo, status: "pendente", responsavel_id: null, prazo_sla: null, criado_em, atualizado_em}`.
A API confere cada arquivo no Storage (existe, é meu, tamanho e tipo reais), move para `chamados/{id}/...`, grava o
histórico `criado` e avisa o solicitante e a TI. `respostas` segue as chaves de `campos_form` da categoria.

### Ações sobre o chamado

Todas respondem com o chamado atualizado (`{id, titulo, status, responsavel_id, prazo_sla, ...}`) e gravam histórico +
aviso. Regras completas em [`docs/status.md`](status.md).

| Rota | Quem | Corpo | Resultado |
|---|---|---|---|
| `GET /chamados/{id}/acoes` | quem vê o chamado | — | `{"acoes": ["assumir", ...]}` — os botões que o front deve mostrar |
| `POST /chamados/{id}/assumir` | TI | — | `em_andamento`, responsável = eu |
| `POST /chamados/{id}/aguardar` | TI | — | `aguardando_usuario` |
| `POST /chamados/{id}/retomar` | TI | — | `em_andamento` |
| `POST /chamados/{id}/concluir` | TI | — | `concluido` (final; mesmo sem resposta do solicitante) |
| `POST /chamados/{id}/transferir` | TI | `{"destino_id": "<uuid>", "motivo": "..."}` | `transferido`; o destino precisa assumir |
| `POST /chamados/{id}/devolver` | TI | `{"motivo": "..."}` | `pendente`, sem responsável |
| `POST /chamados/{id}/cancelar` | TI; solicitante só em `pendente` | `{"motivo": "..."}` | `cancelado` |

O motivo de transferir/devolver vai para o histórico **só da TI** (aparece no Relato técnico).

### Prazo (definido pela TI)

`POST /chamados/{id}/prazo` → chamado atualizado ([ADR 0009](adr/0009-prazo-definido-pela-ti.md))

```json
{ "prazo": "2026-10-08T21:00:00Z", "motivo": "Aguardando a peça" }
```

- Só **TI**; chamado não encerrado (`TRANSICAO_INVALIDA`); `prazo` com fuso, no futuro e até 1 ano (`PRAZO_INVALIDO`).
- 1ª definição: `motivo` opcional. **Alterar** um prazo já definido: `motivo` obrigatório (`MOTIVO_OBRIGATORIO`).
- Grava `historico` `prazo_definido` (público: o solicitante vê a nova data e o motivo) e avisa o solicitante.

### Conversa e Relato técnico

`POST /chamados/{id}/mensagens` → **201** `{id, criado_em}`

```json
{ "conteudo": "Consegue testar agora?", "interna": false, "anexos": [] }
```

- `interna: true` = anotação do **Relato técnico** (só TI; solicitante → `SEM_PERMISSAO`). Não gera aviso.
- Resposta do solicitante com o chamado em `aguardando_usuario` → volta sozinho para `em_andamento` (histórico sem
  autor) e avisa o técnico responsável.
- Texto vazio sem anexo → `CAMPO_OBRIGATORIO` (`conteudo`). Chamado encerrado → `TRANSICAO_INVALIDA`.

`POST /chamados/{id}/lido` → **204**. Marca a conversa como lida até a última mensagem que **eu** posso ver (contador
de não lidas).

### Baixar anexo

`GET /anexos/{anexo_id}/url` → `{"url": "<URL assinada, vale 60 s>"}`. Só se eu posso ver o anexo: anexo de anotação
do Relato técnico nunca abre para o solicitante.

## Testes

- `tests/rotas/` — todas as rotas com repositório e Storage em memória ([ADR 0008](adr/0008-repositorio-da-api.md)),
  incluindo solicitante tentando cada ação da TI e mexendo no chamado de outra pessoa.
- `tests/integracao/` (marca `banco`) — contra um Supabase de verdade; roda no job `banco` do CI.
