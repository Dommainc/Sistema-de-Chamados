"""Proteções HTTP da API (docs/segredos.md, "Proteções do site e da API").

- Cabeçalhos de segurança em toda resposta (nada de cache de dados de chamado no navegador/proxy).
- Corpo de requisição limitado: a API só recebe JSON (arquivos vão direto ao Storage pela URL assinada),
  então 1 MB sobra. Acima disso → 413, sem ler o corpo.
"""

from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.erros.catalogo import gerar_ref_erro, mensagem_erro

#: Maior corpo aceito (JSON). Mensagem do chat tem no máximo 10 mil caracteres.
TAMANHO_MAX_CORPO = 1024 * 1024

CABECALHOS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
}


class ProtecoesHttp(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        tamanho = request.headers.get("content-length")
        if tamanho is not None and (not tamanho.isdigit() or int(tamanho) > TAMANHO_MAX_CORPO):
            ref = gerar_ref_erro()
            resposta: Response = JSONResponse(
                status_code=413,
                content={
                    "erro": {
                        "codigo": "ERRO_INESPERADO",
                        "mensagem": mensagem_erro("ERRO_INESPERADO", ref=ref),
                        "ref": ref,
                    }
                },
            )
        else:
            resposta = await call_next(request)
        for nome, valor in CABECALHOS.items():
            resposta.headers.setdefault(nome, valor)
        return resposta
