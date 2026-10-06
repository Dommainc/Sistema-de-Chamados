"""Validação do JWT do Supabase (docs/adr/0007): JWKS (ES256) e segredo (HS256)."""

import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.auth import UsuarioAtual, VerificadorJwt, obter_verificador
from app.erros.catalogo import ErroApp
from app.erros.handlers import registrar_handlers

SEGREDO = "segredo-de-teste-com-tamanho-suficiente-123456"
CHAVE_PRIVADA = ec.generate_private_key(ec.SECP256R1())
OUTRA_CHAVE = ec.generate_private_key(ec.SECP256R1())


def token(*, alg="ES256", chave=None, expira_em=3600, **extra) -> str:
    agora = int(time.time())
    claims = {"sub": "usuario-1", "aud": "authenticated", "exp": agora + expira_em, "iat": agora}
    claims.update(extra)
    if alg == "HS256":
        return jwt.encode(claims, chave or SEGREDO, algorithm="HS256")
    return jwt.encode(claims, chave or CHAVE_PRIVADA, algorithm="ES256")


def verificador(**kw) -> VerificadorJwt:
    padrao = {
        "audience": "authenticated",
        "segredo": SEGREDO,
        "buscar_chave": lambda _token: CHAVE_PRIVADA.public_key(),
    }
    return VerificadorJwt(**{**padrao, **kw})


def codigo(fn) -> str:
    with pytest.raises(ErroApp) as erro:
        fn()
    return erro.value.codigo


def test_aceita_es256_pelas_chaves_publicas_e_hs256_pelo_segredo():
    assert verificador().verificar(token())["sub"] == "usuario-1"
    assert verificador().verificar(token(alg="HS256"))["sub"] == "usuario-1"


def test_expirado_vira_sessao_expirada():
    assert codigo(lambda: verificador().verificar(token(expira_em=-10))) == "SESSAO_EXPIRADA"


def test_assinatura_errada_audiencia_errada_e_lixo():
    v = verificador()
    assert codigo(lambda: v.verificar(token(chave=OUTRA_CHAVE))) == "SESSAO_EXPIRADA"
    assert codigo(
        lambda: v.verificar(token(alg="HS256", chave="outro-segredo-qualquer-0123456789"))
    ) == ("SESSAO_EXPIRADA")
    assert codigo(lambda: v.verificar(token(aud="anon"))) == "SESSAO_EXPIRADA"
    assert codigo(lambda: v.verificar("nao-e-um-jwt")) == "SESSAO_EXPIRADA"


def test_hs256_sem_segredo_configurado_e_recusado():
    assert codigo(lambda: verificador(segredo=None).verificar(token(alg="HS256"))) == (
        "SESSAO_EXPIRADA"
    )


# -------------------------------------------------------------------- pelo cabeçalho Authorization
def cliente() -> TestClient:
    app = FastAPI()
    registrar_handlers(app)

    @app.get("/eu")
    def eu(usuario: UsuarioAtual) -> dict[str, str]:
        return {"id": usuario.id}

    app.dependency_overrides[obter_verificador] = lambda: verificador()
    return TestClient(app)


def test_rota_protegida_recebe_o_usuario_do_token():
    resposta = cliente().get("/eu", headers={"Authorization": f"Bearer {token()}"})
    assert resposta.status_code == 200
    assert resposta.json() == {"id": "usuario-1"}


@pytest.mark.parametrize(
    "cabecalho",
    [None, "Basic abc", "Bearer ", "Bearer token-invalido"],
)
def test_sem_token_ou_token_invalido_da_401_com_a_mensagem_do_catalogo(cabecalho):
    headers = {"Authorization": cabecalho} if cabecalho is not None else {}
    resposta = cliente().get("/eu", headers=headers)
    assert resposta.status_code == 401
    assert resposta.json()["erro"]["codigo"] == "SESSAO_EXPIRADA"
    assert resposta.json()["erro"]["mensagem"] == (
        "Sua sessão expirou. Entre novamente com sua conta Microsoft."
    )
