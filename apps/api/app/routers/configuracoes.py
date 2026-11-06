"""Tela de Configurações da TI (Fase 2 — docs/adr/0022).

A LEITURA é direta do Supabase pelo front (RLS: a TI vê também o que está desativado). Aqui ficam as
GRAVAÇÕES: confere que quem pede é da TI (lendo como o usuário), grava como central_api e registra em
config_alteracoes, tudo na mesma transação (docs/adr/0002). Nada é apagado: retirar = desativar.
"""

from __future__ import annotations

import json
from datetime import date
from typing import Annotated, Any, Literal

import asyncpg
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.auth import UsuarioAtual
from app.db import Banco, Transacao, obter_banco
from app.dominio.configuracoes import (
    ICONES_ASSUNTO,
    OpcaoEditada,
    comparar_opcoes,
    cores_da_lista,
    normalizar_opcoes,
    texto_limpo,
    validar_expediente,
)
from app.erros.catalogo import ErroApp, ErroDeCampo, mensagem_erro
from app.erros.respostas import RESPOSTAS_COM_LOGIN

router = APIRouter(prefix="/configuracoes", tags=["configurações"], responses=RESPOSTAS_COM_LOGIN)

BancoDep = Annotated[Banco, Depends(obter_banco)]
AreaConfig = Literal["formularios", "assuntos", "respostas_prontas", "feriados", "expediente"]

#: Campo "Descreva o que está acontecendo" que todo assunto tem (igual ao seed.sql).
_DESCRICAO_PADRAO = (
    "descricao",
    "Descreva o que está acontecendo",
    "Conte o que aconteceu e, se puder, cole um print da tela (Ctrl+V).",
)


# ------------------------------------------------------------------------------------ modelos
class OpcaoEntrada(BaseModel):
    nome: str = Field(max_length=200)
    cor: str | None = None
    antigo: str | None = Field(default=None, description="Nome que a opção tinha (renomear)")


class OpcoesEntrada(BaseModel):
    opcoes: list[OpcaoEntrada] = Field(max_length=200)


class CampoSaida(BaseModel):
    id: int
    opcoes: list[str]
    cores: dict[str, str]


class AssuntoEntrada(BaseModel):
    nome: str = Field(min_length=2, max_length=120)
    nome_curto: str = Field(min_length=2, max_length=40)
    descricao: str = Field(default="", max_length=300)
    icone: str = "ellipsis"


class AssuntoEdicao(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=120)
    nome_curto: str | None = Field(default=None, min_length=2, max_length=40)
    descricao: str | None = Field(default=None, max_length=300)
    icone: str | None = None
    ativo: bool | None = None


class OrdemEntrada(BaseModel):
    ids: list[int] = Field(min_length=1, max_length=200)


class RespostaEntrada(BaseModel):
    titulo: str = Field(min_length=1, max_length=60)
    texto: str = Field(min_length=1, max_length=2000)


class RespostaEdicao(BaseModel):
    titulo: str | None = Field(default=None, min_length=1, max_length=60)
    texto: str | None = Field(default=None, min_length=1, max_length=2000)
    ativo: bool | None = None


class FeriadoEntrada(BaseModel):
    data: date
    nome: str = Field(min_length=2, max_length=80)
    escopo: Literal["nacional", "estadual", "municipal", "ponto_facultativo"] = "nacional"


class FeriadoEdicao(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=80)
    ativo: bool | None = None


class ExpedienteEntrada(BaseModel):
    inicio: str = Field(description="HH:MM", examples=["08:00"])
    fim: str = Field(description="HH:MM", examples=["20:00"])


class OkSaida(BaseModel):
    ok: bool = True


# ------------------------------------------------------------------------------------ apoio
async def _exigir_ti(t: Transacao) -> None:
    """Lê como o usuário: só a TI (ativa) mexe nas configurações."""
    await t.como_usuario()
    if not await t.conn.fetchval("select app.eh_ti()"):
        raise ErroApp("SEM_PERMISSAO", detalhe="configurações: só a TI")


async def _registrar(
    t: Transacao, autor: str, area: AreaConfig, resumo: str, detalhe: dict[str, Any]
) -> None:
    """Já como central_api: uma linha no registro de alterações."""
    await t.conn.execute(
        "insert into public.config_alteracoes (area, resumo, detalhe, autor_id)"
        " values ($1, $2, $3::jsonb, $4)",
        area,
        resumo[:500],
        json.dumps(detalhe, default=str, ensure_ascii=False),
        autor,
    )


def _duplicado(campo: str, nome: str) -> ErroApp:
    return ErroApp(
        "NOME_DUPLICADO",
        {"campo": nome},
        campos=[ErroDeCampo(campo, mensagem_erro("NOME_DUPLICADO", campo=nome))],
    )


def _icone(valor: str) -> str:
    if valor not in ICONES_ASSUNTO:
        raise ErroApp(
            "CAMPO_OBRIGATORIO",
            {"campo": "Ícone"},
            campos=[ErroDeCampo("icone", mensagem_erro("CAMPO_OBRIGATORIO", campo="Ícone"))],
        )
    return valor


def _lista(valor: Any) -> list[Any]:
    return json.loads(valor) if isinstance(valor, str) else list(valor or [])


def _mapa(valor: Any) -> dict[str, Any]:
    return json.loads(valor) if isinstance(valor, str) else dict(valor or {})


async def _reordenar(t: Transacao, tabela: str, ids: list[int]) -> None:
    """ordem = 10, 20, 30... na ordem recebida (ids desconhecidos são ignorados)."""
    await t.conn.execute(
        f"update public.{tabela} x set ordem = n.pos * 10"  # tabela fixa no código
        " from unnest($1::bigint[]) with ordinality as n(id, pos) where x.id = n.id",
        ids,
    )


# ------------------------------------------------------------------------- 1. formulários
@router.patch("/campos/{campo_id}/opcoes", summary="Salvar a lista de opções de uma pergunta")
async def salvar_opcoes(
    campo_id: int, dados: OpcoesEntrada, usuario: UsuarioAtual, banco: BancoDep
) -> CampoSaida:
    async with banco.transacao(usuario) as t:
        await _exigir_ti(t)
        campo = await t.conn.fetchrow(
            "select id, categoria_id, chave, label, opcoes, cores from public.campos_form"
            " where id = $1 and tipo in ('selecao', 'multipla_selecao')",
            campo_id,
        )
        if campo is None:
            raise ErroApp("SEM_PERMISSAO", detalhe=f"campo {campo_id} não é de opções")
        antes: list[str] = _lista(campo["opcoes"])
        cores_antes: dict[str, str] = _mapa(campo["cores"])
        novas = normalizar_opcoes([OpcaoEditada(o.nome, o.cor, o.antigo) for o in dados.opcoes])
        mudanca = comparar_opcoes(antes, cores_antes, novas)
        cores = cores_da_lista(novas)
        if mudanca.vazia:
            return CampoSaida(id=campo_id, opcoes=antes, cores=cores_antes)

        # Perguntas que só aparecem com uma opção escolhida (ex.: módulo do Sienge — migration 0031).
        dependentes: list[asyncpg.Record] = await t.conn.fetch(
            "select id, mostrar_se ->> 'igual' as igual from public.campos_form"
            " where categoria_id = $1 and mostrar_se ->> 'campo' = $2",
            campo["categoria_id"],
            campo["chave"],
        )
        presas = {d["igual"] for d in dependentes} & set(mudanca.removidas)
        if presas:
            raise ErroApp("OPCAO_COM_PERGUNTAS", {"campo": sorted(presas)[0]})

        await t.como_api()
        await t.conn.execute(
            "update public.campos_form set opcoes = $2::jsonb, cores = $3::jsonb where id = $1",
            campo_id,
            json.dumps([o.nome for o in novas], ensure_ascii=False),
            json.dumps(cores, ensure_ascii=False),
        )
        for antigo, novo in mudanca.renomeadas.items():
            await t.conn.execute(
                "update public.campos_form"
                " set mostrar_se = jsonb_set(mostrar_se, '{igual}', to_jsonb($3::text))"
                " where categoria_id = $1 and mostrar_se ->> 'campo' = $2"
                " and mostrar_se ->> 'igual' = $4",
                campo["categoria_id"],
                campo["chave"],
                novo,
                antigo,
            )
        await _registrar(
            t,
            usuario.id,
            "formularios",
            mudanca.resumo(campo["label"]),
            {"campo_id": campo_id, "antes": antes, "depois": [o.nome for o in novas]},
        )
        return CampoSaida(id=campo_id, opcoes=[o.nome for o in novas], cores=cores)


# ------------------------------------------------------------------------------ 2. assuntos
async def _nome_de_assunto_livre(t: Transacao, nome: str, exceto: int | None = None) -> None:
    existe = await t.conn.fetchval(
        "select exists (select 1 from public.categorias"
        " where lower(nome) = lower($1) and id is distinct from $2)",
        nome,
        exceto,
    )
    if existe:
        raise _duplicado("nome", nome)


@router.post("/assuntos", summary="Criar um assunto (já com a pergunta de descrição)")
async def criar_assunto(dados: AssuntoEntrada, usuario: UsuarioAtual, banco: BancoDep) -> OkSaida:
    nome, curto = texto_limpo(dados.nome), texto_limpo(dados.nome_curto)
    async with banco.transacao(usuario) as t:
        await _exigir_ti(t)
        await _nome_de_assunto_livre(t, nome)
        await t.como_api()
        novo_id = await t.conn.fetchval(
            """
            insert into public.categorias (area_id, nome, nome_curto, icone, descricao, sla_horas, ordem)
            select (select id from public.areas order by id limit 1), $1, $2, $3, $4, 8,
                   coalesce((select max(ordem) from public.categorias), 0) + 10
            returning id
            """,
            nome,
            curto,
            _icone(dados.icone),
            dados.descricao.strip() or None,
        )
        chave, label, ajuda = _DESCRICAO_PADRAO
        await t.conn.execute(
            "insert into public.campos_form (categoria_id, chave, label, tipo, obrigatorio, ajuda, ordem)"
            " values ($1, $2, $3, 'texto_longo', true, $4, 100)",
            novo_id,
            chave,
            label,
            ajuda,
        )
        await _registrar(t, usuario.id, "assuntos", f"Novo assunto: {curto}", {"id": novo_id})
    return OkSaida()


@router.patch("/assuntos/{assunto_id}", summary="Editar, desativar ou reativar um assunto")
async def editar_assunto(
    assunto_id: int, dados: AssuntoEdicao, usuario: UsuarioAtual, banco: BancoDep
) -> OkSaida:
    async with banco.transacao(usuario) as t:
        await _exigir_ti(t)
        atual = await t.conn.fetchrow(
            "select id, nome, nome_curto, icone, descricao, ativo from public.categorias where id = $1",
            assunto_id,
        )
        if atual is None:
            raise ErroApp("SEM_PERMISSAO", detalhe=f"assunto {assunto_id} não existe")
        novo = {
            "nome": texto_limpo(dados.nome) if dados.nome is not None else atual["nome"],
            "nome_curto": (
                texto_limpo(dados.nome_curto)
                if dados.nome_curto is not None
                else atual["nome_curto"]
            ),
            "icone": _icone(dados.icone) if dados.icone is not None else atual["icone"],
            "descricao": (
                (dados.descricao.strip() or None)
                if dados.descricao is not None
                else atual["descricao"]
            ),
            "ativo": dados.ativo if dados.ativo is not None else atual["ativo"],
        }
        if novo["nome"] != atual["nome"]:
            await _nome_de_assunto_livre(t, novo["nome"], assunto_id)
        if all(novo[k] == atual[k] for k in novo):
            return OkSaida()
        await t.como_api()
        await t.conn.execute(
            "update public.categorias set nome = $2, nome_curto = $3, icone = $4, descricao = $5,"
            " ativo = $6 where id = $1",
            assunto_id,
            novo["nome"],
            novo["nome_curto"],
            novo["icone"],
            novo["descricao"],
            novo["ativo"],
        )
        if novo["ativo"] != atual["ativo"]:
            resumo = (
                f"Assunto {novo['nome_curto']} {'reativado' if novo['ativo'] else 'desativado'}"
            )
        else:
            resumo = f"Assunto {novo['nome_curto']} editado"
        await _registrar(
            t,
            usuario.id,
            "assuntos",
            resumo,
            {"id": assunto_id, "antes": dict(atual), "depois": novo},
        )
    return OkSaida()


@router.post("/assuntos/ordem", summary="Nova ordem dos assuntos na tela inicial")
async def ordenar_assuntos(dados: OrdemEntrada, usuario: UsuarioAtual, banco: BancoDep) -> OkSaida:
    async with banco.transacao(usuario) as t:
        await _exigir_ti(t)
        await t.como_api()
        await _reordenar(t, "categorias", dados.ids)
        await _registrar(t, usuario.id, "assuntos", "Nova ordem dos assuntos", {"ids": dados.ids})
    return OkSaida()


# ----------------------------------------------------------------------- 3. respostas prontas
async def _titulo_livre(t: Transacao, titulo: str, exceto: int | None = None) -> None:
    existe = await t.conn.fetchval(
        "select exists (select 1 from public.respostas_prontas"
        " where lower(titulo) = lower($1) and id is distinct from $2)",
        titulo,
        exceto,
    )
    if existe:
        raise _duplicado("titulo", titulo)


@router.post("/respostas-prontas", summary="Criar uma resposta pronta do chat")
async def criar_resposta(dados: RespostaEntrada, usuario: UsuarioAtual, banco: BancoDep) -> OkSaida:
    titulo, texto = texto_limpo(dados.titulo), dados.texto.strip()
    if not titulo or not texto:
        raise ErroApp("CAMPO_OBRIGATORIO", {"campo": "Título" if not titulo else "Texto"})
    async with banco.transacao(usuario) as t:
        await _exigir_ti(t)
        await _titulo_livre(t, titulo)
        await t.como_api()
        novo_id = await t.conn.fetchval(
            "insert into public.respostas_prontas (titulo, texto, ordem)"
            " values ($1, $2, coalesce((select max(ordem) from public.respostas_prontas), 0) + 10)"
            " returning id",
            titulo,
            texto,
        )
        await _registrar(
            t, usuario.id, "respostas_prontas", f"Nova resposta pronta: {titulo}", {"id": novo_id}
        )
    return OkSaida()


@router.patch("/respostas-prontas/{resposta_id}", summary="Editar, desativar ou reativar")
async def editar_resposta(
    resposta_id: int, dados: RespostaEdicao, usuario: UsuarioAtual, banco: BancoDep
) -> OkSaida:
    async with banco.transacao(usuario) as t:
        await _exigir_ti(t)
        atual = await t.conn.fetchrow(
            "select id, titulo, texto, ativo from public.respostas_prontas where id = $1",
            resposta_id,
        )
        if atual is None:
            raise ErroApp("SEM_PERMISSAO", detalhe=f"resposta {resposta_id} não existe")
        novo = {
            "titulo": texto_limpo(dados.titulo) if dados.titulo is not None else atual["titulo"],
            "texto": dados.texto.strip() if dados.texto is not None else atual["texto"],
            "ativo": dados.ativo if dados.ativo is not None else atual["ativo"],
        }
        if not novo["titulo"] or not novo["texto"]:
            raise ErroApp(
                "CAMPO_OBRIGATORIO", {"campo": "Título" if not novo["titulo"] else "Texto"}
            )
        if novo["titulo"] != atual["titulo"]:
            await _titulo_livre(t, novo["titulo"], resposta_id)
        if all(novo[k] == atual[k] for k in novo):
            return OkSaida()
        await t.como_api()
        await t.conn.execute(
            "update public.respostas_prontas set titulo = $2, texto = $3, ativo = $4 where id = $1",
            resposta_id,
            novo["titulo"],
            novo["texto"],
            novo["ativo"],
        )
        if novo["ativo"] != atual["ativo"]:
            estado = "reativada" if novo["ativo"] else "desativada"
            resumo = f"Resposta pronta {novo['titulo']} {estado}"
        else:
            resumo = f"Resposta pronta {novo['titulo']} editada"
        await _registrar(t, usuario.id, "respostas_prontas", resumo, {"id": resposta_id})
    return OkSaida()


@router.post("/respostas-prontas/ordem", summary="Nova ordem das respostas prontas")
async def ordenar_respostas(dados: OrdemEntrada, usuario: UsuarioAtual, banco: BancoDep) -> OkSaida:
    async with banco.transacao(usuario) as t:
        await _exigir_ti(t)
        await t.como_api()
        await _reordenar(t, "respostas_prontas", dados.ids)
        await _registrar(
            t,
            usuario.id,
            "respostas_prontas",
            "Nova ordem das respostas prontas",
            {"ids": dados.ids},
        )
    return OkSaida()


# ------------------------------------------------------------------- 4. feriados e expediente
def _data_br(d: date) -> str:
    return d.strftime("%d/%m/%Y")


@router.post("/feriados", summary="Cadastrar um feriado (ou reativar a data)")
async def criar_feriado(dados: FeriadoEntrada, usuario: UsuarioAtual, banco: BancoDep) -> OkSaida:
    nome = texto_limpo(dados.nome)
    async with banco.transacao(usuario) as t:
        await _exigir_ti(t)
        ativo = await t.conn.fetchval(
            "select ativo from public.feriados where data = $1", dados.data
        )
        if ativo:
            raise ErroApp("FERIADO_DUPLICADO", {"campo": _data_br(dados.data)})
        await t.como_api()
        await t.conn.execute(
            "insert into public.feriados (data, nome, escopo) values ($1, $2, $3)"
            " on conflict (data) do update set nome = excluded.nome, escopo = excluded.escopo,"
            " ativo = true",
            dados.data,
            nome,
            dados.escopo,
        )
        await _registrar(
            t,
            usuario.id,
            "feriados",
            f"Feriado {_data_br(dados.data)} · {nome}",
            {"data": dados.data},
        )
    return OkSaida()


@router.patch("/feriados/{data}", summary="Renomear, desativar ou reativar um feriado")
async def editar_feriado(
    data: date, dados: FeriadoEdicao, usuario: UsuarioAtual, banco: BancoDep
) -> OkSaida:
    async with banco.transacao(usuario) as t:
        await _exigir_ti(t)
        atual = await t.conn.fetchrow(
            "select nome, ativo from public.feriados where data = $1", data
        )
        if atual is None:
            raise ErroApp("SEM_PERMISSAO", detalhe=f"feriado {data} não existe")
        nome = texto_limpo(dados.nome) if dados.nome is not None else atual["nome"]
        ativo = dados.ativo if dados.ativo is not None else atual["ativo"]
        if nome == atual["nome"] and ativo == atual["ativo"]:
            return OkSaida()
        await t.como_api()
        await t.conn.execute(
            "update public.feriados set nome = $2, ativo = $3 where data = $1", data, nome, ativo
        )
        if ativo != atual["ativo"]:
            resumo = f"Feriado {_data_br(data)} {'reativado' if ativo else 'desativado'}"
        else:
            resumo = f"Feriado {_data_br(data)} renomeado para {nome}"
        await _registrar(t, usuario.id, "feriados", resumo, {"data": data})
    return OkSaida()


@router.patch("/expediente", summary="Horário do expediente (horas úteis e automações)")
async def salvar_expediente(
    dados: ExpedienteEntrada, usuario: UsuarioAtual, banco: BancoDep
) -> OkSaida:
    inicio, fim = validar_expediente(dados.inicio, dados.fim)
    async with banco.transacao(usuario) as t:
        await _exigir_ti(t)
        antes = await t.conn.fetch(
            "select chave, valor #>> '{}' as valor from public.configuracoes"
            " where chave in ('expediente_inicio', 'expediente_fim')"
        )
        atual = {linha["chave"]: linha["valor"] for linha in antes}
        de_ini = atual.get("expediente_inicio", "08:00")
        de_fim = atual.get("expediente_fim", "20:00")
        if (de_ini, de_fim) == (inicio, fim):
            return OkSaida()
        await t.como_api()
        for chave, valor in (("expediente_inicio", inicio), ("expediente_fim", fim)):
            await t.conn.execute(
                "insert into public.configuracoes (chave, valor, publico, atualizado_por, atualizado_em)"
                " values ($1, to_jsonb($2::text), true, $3, now())"
                " on conflict (chave) do update set valor = excluded.valor,"
                " atualizado_por = excluded.atualizado_por, atualizado_em = now()",
                chave,
                valor,
                usuario.id,
            )
        await _registrar(
            t,
            usuario.id,
            "expediente",
            f"Expediente: {de_ini}–{de_fim} → {inicio}–{fim}",
            {"antes": [de_ini, de_fim], "depois": [inicio, fim]},
        )
    return OkSaida()
