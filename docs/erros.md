# Catálogo de erros

Fonte única: `apps/api/app/erros/catalogo.py` ↔ `apps/web/lib/erros/catalogo.ts` (mesmos códigos e textos).
Regra: **nunca** mostrar stack trace, SQL ou mensagem crua do Supabase. Erro inesperado gera uma referência curta
(`ERR-7F3A`) que aparece na tela e no log, para a TI achar o problema.

Formato da API:
```json
{ "erro": { "codigo": "ANEXO_MUITO_GRANDE", "mensagem": "texto amigável", "detalhe": "só em dev", "campos": [] } }
```

| Código | Quando | Mensagem | Onde aparece |
|---|---|---|---|
| `CAMPO_OBRIGATORIO` | Campo vazio ou inválido no formulário | Preencha o campo **{campo}** para continuar. | Embaixo do campo (lista `campos`) |
| `ANEXO_MUITO_GRANDE` | Arquivo acima de 10 MB | Esse arquivo tem mais de 10 MB. Tente um arquivo menor ou envie um print da tela. | Aviso (toast) |
| `ANEXO_TIPO_INVALIDO` | Tipo não permitido (ex.: `.exe`) | Esse tipo de arquivo não é aceito. Envie imagem, PDF ou documento do Office. | Aviso |
| `COLAR_SEM_IMAGEM` | Ctrl+V na área de anexos sem imagem | Não encontramos uma imagem para colar. Copie o print e tente de novo. | Aviso |
| `UPLOAD_FALHOU` | Falha ao enviar/mover o arquivo | Não conseguimos enviar o arquivo. Verifique sua conexão e tente novamente. | Aviso |
| `SESSAO_EXPIRADA` | Token expirado | Sua sessão expirou. Entre novamente com sua conta Microsoft. | Aviso + volta para o login |
| `SEM_PERMISSAO` | RLS ou papel bloqueou (inclusive chamado de outra pessoa ou inexistente, para o solicitante) | Você não tem acesso a este chamado. Se acha que isso é um erro, fale com a TI. | Tela inteira |
| `CHAMADO_NAO_ENCONTRADO` | Número inexistente (só para a TI) | Não encontramos o chamado **#{numero}**. Confira o número e tente de novo. | Tela inteira |
| `TRANSICAO_INVALIDA` | Mudança de status não permitida (ou chamado encerrado) | Não é possível mudar de **{de}** para **{para}**. | Aviso |
| `MOTIVO_OBRIGATORIO` | Cancelar/transferir/devolver sem motivo | Informe o motivo para continuar. | Embaixo do campo do motivo |
| `CANCELAMENTO_NAO_PERMITIDO` | Solicitante cancelando depois do início do atendimento | Esse chamado já está sendo atendido. Para cancelar, fale com a TI pelo chat. | Aviso |
| `MENSAGEM_NAO_ENVIADA` | Falha ao enviar mensagem | Sua mensagem não foi enviada. Toque para tentar de novo. *(o texto é mantido)* | No próprio balão |
| `SEM_CONEXAO` | Sem internet / tempo real caiu | Sem conexão. As mensagens novas vão aparecer quando a conexão voltar. | Faixa no chat |
| `ERRO_INESPERADO` | Qualquer outro | Algo deu errado do nosso lado. Tente novamente. Se continuar, informe o código **{ref}** para a TI. | Aviso ou tela de erro |

## Erros do banco → catálogo

| SQLSTATE | Significado | Vira |
|---|---|---|
| `CC001` | Chamado encerrado é somente leitura | `TRANSICAO_INVALIDA` |
| `CC002` | Campo imutável (ex.: solicitante, data de abertura, histórico) | `ERRO_INESPERADO` |
| `CC003` | Exclusão proibida | `ERRO_INESPERADO` |
| `CC004` | Categoria inativa ou inexistente | `ERRO_INESPERADO` |
| `CC005` | Sem permissão (ex.: nota interna de solicitante) | `SEM_PERMISSAO` |
| `CC006` | Inconsistência (ex.: anexo de mensagem de outro chamado) | `ERRO_INESPERADO` |
| `42501` | Permissão negada pelo Postgres | `SEM_PERMISSAO` |
| `23514` | Regra (check) violada | mapeado pelo nome da regra; desconhecida → `ERRO_INESPERADO` |
