from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.config import Settings, obter_settings
from app.db import Banco, obter_banco

router = APIRouter(tags=["saúde"])


class Saude(BaseModel):
    status: Literal["ok"]
    versao: str
    ambiente: str
    banco: Literal["ok", "indisponivel", "nao_configurado"]


@router.get("/saude", summary="A API está no ar?")
async def saude(
    settings: Annotated[Settings, Depends(obter_settings)],
    banco: Annotated[Banco, Depends(obter_banco)],
) -> Saude:
    if not banco.conectado:
        estado_banco: Literal["ok", "indisponivel", "nao_configurado"] = "nao_configurado"
    else:
        estado_banco = "ok" if await banco.esta_respondendo() else "indisponivel"
    return Saude(status="ok", versao="0.1.0", ambiente=settings.ambiente, banco=estado_banco)
