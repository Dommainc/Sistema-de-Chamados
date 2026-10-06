import re
from pathlib import Path

from app.erros.catalogo import CATALOGO, STATUS_HTTP, ErroApp, mensagem_erro, traduzir_erro_banco

CATALOGO_WEB = Path(__file__).resolve().parents[2] / "web" / "lib" / "erros" / "catalogo.ts"


def test_tem_os_14_codigos_do_escopo():
    assert len(CATALOGO) == 14
    assert set(CATALOGO) == set(STATUS_HTTP)


def test_textos_identicos_aos_do_front():
    """API e front mostram exatamente as mesmas mensagens (docs/erros.md)."""
    fonte = CATALOGO_WEB.read_text(encoding="utf-8")
    bloco = fonte[fonte.index("export const CATALOGO") : fonte.index("} as const")]
    pares = re.findall(r"([A-Z_]+):\s*\"((?:[^\"\\]|\\.)*)\"", bloco)
    textos_web = dict(pares)
    assert textos_web == CATALOGO


def test_placeholders():
    assert mensagem_erro("CAMPO_OBRIGATORIO", campo="Departamento") == (
        "Preencha o campo Departamento para continuar."
    )
    assert "#42" in mensagem_erro("CHAMADO_NAO_ENCONTRADO", numero="42")
    for codigo in CATALOGO:
        texto = mensagem_erro(codigo, campo="X", numero="1", de="A", para="B", ref="ERR-0000")
        assert not re.search(r"\{\w+\}", texto)


def test_erro_inesperado_ganha_referencia_curta():
    erro = ErroApp("ERRO_INESPERADO")
    assert re.fullmatch(r"ERR-[0-9A-F]{4}", erro.ref)
    assert erro.ref in erro.mensagem
    assert erro.status_http == 500
    assert ErroApp("SEM_PERMISSAO").ref is None


def test_traduz_erros_do_banco():
    assert traduzir_erro_banco("42501", None, "permission denied").codigo == "SEM_PERMISSAO"
    assert traduzir_erro_banco("CC005", None, "nota interna").codigo == "SEM_PERMISSAO"
    assert traduzir_erro_banco("CC001", None, "encerrado").codigo == "TRANSICAO_INVALIDA"
    assert (
        traduzir_erro_banco("23514", "chamados_cancelado_exige_motivo", "check").codigo
        == "MOTIVO_OBRIGATORIO"
    )
    desconhecido = traduzir_erro_banco("XX000", None, 'relation "x" does not exist')
    assert desconhecido.codigo == "ERRO_INESPERADO"
    # O texto do Postgres nunca vai para a mensagem, só para o detalhe.
    assert "relation" not in desconhecido.mensagem
    assert "relation" in (desconhecido.detalhe or "")
