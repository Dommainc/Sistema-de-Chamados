"""Rotas de chamados com repositório em memória: regras, histórico, avisos e permissões."""

import pytest

from app.integracoes.storage import InfoArquivo

from .conftest import ANA, BRUNO, INATIVO, INTERNET, OUTROS, RAFAEL, THIAGO

RESPOSTAS_OK = {"alcance": "Só eu", "local": "Obra Recreio", "descricao": "Roteador piscando"}


def codigo(resposta) -> str:
    return resposta.json()["erro"]["codigo"]


# ---------------------------------------------------------------------------------- abrir
def test_abrir_chamado_grava_historico_e_avisa_solicitante_e_ti(cliente, como, estado):
    resposta = cliente.post(
        "/chamados",
        headers=como(ANA),
        json={
            "categoria_id": INTERNET,
            "titulo": "Sem internet na obra",
            "respostas": RESPOSTAS_OK,
        },
    )
    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["status"] == "pendente" and corpo["responsavel_id"] is None
    assert estado.chamados[corpo["id"]].respostas_form == RESPOSTAS_OK
    assert [e.acao for e in estado.eventos] == ["criado"]
    assert {n.destinatario_id for n in estado.notificacoes} == {ANA, RAFAEL, THIAGO}
    assert {n.tipo for n in estado.notificacoes} == {"chamado_aberto"}


def test_abrir_com_campos_vazios_mostra_erro_por_campo(cliente, como, estado):
    resposta = cliente.post("/chamados", headers=como(ANA), json={"categoria_id": INTERNET})
    assert resposta.status_code == 422
    assert codigo(resposta) == "CAMPO_OBRIGATORIO"
    assert [c["campo"] for c in resposta.json()["erro"]["campos"]] == [
        "titulo",
        "alcance",
        "local",
        "descricao",
    ]
    assert len(estado.chamados) == 5  # nada gravado


def test_tecnico_tambem_abre_chamado(cliente, como, estado):
    resposta = cliente.post(
        "/chamados",
        headers=como(RAFAEL),
        json={
            "categoria_id": OUTROS,
            "titulo": "Wi-Fi da sala",
            "respostas": {"descricao": "caiu"},
        },
    )
    assert resposta.status_code == 201
    assert estado.chamados[resposta.json()["id"]].solicitante_id == RAFAEL


def test_chamado_nasce_sem_prazo(cliente, como):
    resposta = cliente.post(
        "/chamados",
        headers=como(ANA),
        json={"categoria_id": OUTROS, "titulo": "Sem prazo", "respostas": {"descricao": "x"}},
    )
    assert resposta.json()["prazo_sla"] is None


# ---------------------------------------------------------------------------------- prazo
def test_tecnico_define_o_prazo_e_o_solicitante_e_avisado(cliente, como, estado):
    resposta = cliente.post(
        "/chamados/42/prazo", headers=como(RAFAEL), json={"prazo": "2026-10-08T20:00:00Z"}
    )
    assert resposta.status_code == 200
    assert resposta.json()["prazo_sla"] == "2026-10-08T20:00:00Z"
    evento = estado.eventos[-1]
    assert (evento.acao, evento.publico) == ("prazo_definido", True)
    assert evento.detalhe == {"prazo": "2026-10-08T20:00:00+00:00"}
    [aviso] = estado.notificacoes
    assert (aviso.tipo, aviso.destinatario_id) == ("prazo_definido", ANA)


def test_alterar_o_prazo_exige_motivo_e_guarda_o_anterior(cliente, como, estado):
    url = "/chamados/41/prazo"
    sem_motivo = cliente.post(url, headers=como(RAFAEL), json={"prazo": "2026-10-09T20:00:00Z"})
    assert codigo(sem_motivo) == "MOTIVO_OBRIGATORIO"
    ok = cliente.post(
        url,
        headers=como(THIAGO),
        json={"prazo": "2026-10-09T20:00:00Z", "motivo": "Aguardando a licença"},
    )
    assert ok.status_code == 200
    detalhe = estado.eventos[-1].detalhe
    assert detalhe["motivo"] == "Aguardando a licença"
    assert detalhe["prazo_anterior"].startswith("2026-10-06T")


@pytest.mark.parametrize(
    "prazo",
    ["2026-10-06T12:00:00Z", "2028-01-01T12:00:00Z", "2026-10-08T17:00:00"],
    ids=["passado", "mais-de-um-ano", "sem-fuso"],
)
def test_prazo_invalido(cliente, como, prazo):
    resposta = cliente.post("/chamados/42/prazo", headers=como(RAFAEL), json={"prazo": prazo})
    assert resposta.status_code == 422
    assert codigo(resposta) == "PRAZO_INVALIDO"


def test_prazo_so_da_ti_e_nunca_em_encerrado(cliente, como, estado):
    corpo = {"prazo": "2026-10-08T20:00:00Z"}
    assert codigo(cliente.post("/chamados/42/prazo", headers=como(ANA), json=corpo)) == (
        "SEM_PERMISSAO"
    )
    assert estado.chamados[42].prazo_sla is None
    encerrado = cliente.post(
        "/chamados/35/prazo", headers=como(RAFAEL), json={**corpo, "motivo": "x"}
    )
    assert codigo(encerrado) == "TRANSICAO_INVALIDA"


# ---------------------------------------------------------------------------------- anexos
def test_upload_url_valida_antes_de_enviar(cliente, como):
    ok = cliente.post(
        "/anexos/upload-url",
        headers=como(ANA),
        json={"nome": "print.png", "mime": "image/png", "tamanho": 1000},
    )
    assert ok.status_code == 200
    assert ok.json()["upload_id"].startswith(f"temporarios/{ANA}/")
    exe = cliente.post(
        "/anexos/upload-url",
        headers=como(ANA),
        json={"nome": "setup.exe", "mime": "application/x-msdownload", "tamanho": 1000},
    )
    assert codigo(exe) == "ANEXO_TIPO_INVALIDO"
    grande = cliente.post(
        "/anexos/upload-url",
        headers=como(ANA),
        json={"nome": "video.png", "mime": "image/png", "tamanho": 11 * 1024 * 1024},
    )
    assert codigo(grande) == "ANEXO_MUITO_GRANDE"


def _subir(cliente, como, storage, usuario, nome="print.png", tamanho=1000, mime="image/png"):
    upload_id = cliente.post(
        "/anexos/upload-url",
        headers=como(usuario),
        json={"nome": nome, "mime": "image/png", "tamanho": 1000},
    ).json()["upload_id"]
    storage.arquivos[upload_id] = InfoArquivo(tamanho, mime)  # o navegador enviou
    return upload_id


def test_abrir_com_print_colado_move_o_arquivo_e_registra_o_anexo(cliente, como, estado, storage):
    upload_id = _subir(cliente, como, storage, ANA, "print-20261006-090000.png")
    resposta = cliente.post(
        "/chamados",
        headers=como(ANA),
        json={
            "categoria_id": OUTROS,
            "titulo": "Erro na tela",
            "respostas": {"descricao": "veja o print"},
            "anexos": [
                {"upload_id": upload_id, "nome": "print-20261006-090000.png", "origem": "colado"}
            ],
        },
    )
    assert resposta.status_code == 201
    chamado_id = resposta.json()["id"]
    [anexo] = estado.anexos
    assert anexo.path.startswith(f"chamados/{chamado_id}/") and anexo.mensagem_id is None
    assert upload_id not in storage.arquivos and anexo.path in storage.arquivos


def test_anexo_de_outro_usuario_ou_inexistente_ou_tamanho_real_errado(cliente, como, storage):
    do_bruno = _subir(cliente, como, storage, BRUNO)
    base = {"categoria_id": OUTROS, "titulo": "Teste", "respostas": {"descricao": "x"}}

    def abrir(upload_id):
        return cliente.post(
            "/chamados",
            headers=como(ANA),
            json={**base, "anexos": [{"upload_id": upload_id, "nome": "a.png"}]},
        )

    assert codigo(abrir(do_bruno)) == "UPLOAD_FALHOU"
    assert codigo(abrir(f"temporarios/{ANA}/nao-existe.png")) == "UPLOAD_FALHOU"
    # Disse 1 KB, mas o arquivo que chegou tem 11 MB: vale o tamanho real.
    mentiroso = _subir(cliente, como, storage, ANA, tamanho=11 * 1024 * 1024)
    assert codigo(abrir(mentiroso)) == "ANEXO_MUITO_GRANDE"


# --------------------------------------------------------------------------- ações da TI
def test_assumir_grava_historico_e_avisa_o_solicitante(cliente, como, estado):
    resposta = cliente.post("/chamados/42/assumir", headers=como(RAFAEL))
    assert resposta.status_code == 200
    assert resposta.json()["status"] == "em_andamento"
    assert resposta.json()["responsavel_id"] == RAFAEL
    assert estado.eventos[-1].acao == "assumido"
    assert [(n.tipo, n.destinatario_id) for n in estado.notificacoes] == [("chamado_assumido", ANA)]


def test_transferir_exige_motivo_e_tecnico_e_registra_a_transferencia(cliente, como, estado):
    url = "/chamados/41/transferir"
    assert codigo(cliente.post(url, headers=como(RAFAEL), json={"destino_id": THIAGO})) == (
        "MOTIVO_OBRIGATORIO"
    )
    sem_ser_ti = cliente.post(
        url, headers=como(RAFAEL), json={"destino_id": ANA, "motivo": "teste"}
    )
    assert codigo(sem_ser_ti) == "CAMPO_OBRIGATORIO"
    ok = cliente.post(
        url, headers=como(RAFAEL), json={"destino_id": THIAGO, "motivo": "Thiago cuida de e-mail"}
    )
    assert ok.json()["status"] == "transferido" and ok.json()["responsavel_id"] == THIAGO
    assert estado.transferencias[-1].motivo == "Thiago cuida de e-mail"
    assert estado.eventos[-1].publico is False  # motivo só para a TI
    assert {n.destinatario_id for n in estado.notificacoes} == {ANA, THIAGO}


def test_devolver_a_fila_limpa_o_responsavel(cliente, como):
    resposta = cliente.post(
        "/chamados/39/devolver", headers=como(THIAGO), json={"motivo": "Rafael de férias"}
    )
    assert resposta.json()["status"] == "pendente" and resposta.json()["responsavel_id"] is None


def test_concluir_mesmo_aguardando_e_depois_nao_aceita_mais_nada(cliente, como):
    assert (
        cliente.post("/chamados/41/concluir", headers=como(RAFAEL)).json()["status"] == "concluido"
    )
    assert (
        codigo(cliente.post("/chamados/41/retomar", headers=como(RAFAEL))) == "TRANSICAO_INVALIDA"
    )
    mensagem = cliente.post(
        "/chamados/41/mensagens", headers=como(ANA), json={"conteudo": "voltou"}
    )
    assert codigo(mensagem) == "TRANSICAO_INVALIDA"


def test_acoes_disponiveis(cliente, como):
    assert cliente.get("/chamados/42/acoes", headers=como(ANA)).json() == {"acoes": ["cancelar"]}
    assert set(cliente.get("/chamados/41/acoes", headers=como(RAFAEL)).json()["acoes"]) == {
        "retomar",
        "transferir",
        "devolver_fila",
        "concluir",
        "cancelar",
    }


# ----------------------------------------------------------------------------- permissões
@pytest.mark.parametrize(
    ("rota", "corpo"),
    [
        ("assumir", None),
        ("aguardar", None),
        ("retomar", None),
        ("concluir", None),
        ("transferir", {"destino_id": THIAGO, "motivo": "tentativa"}),
        ("devolver", {"motivo": "tentativa"}),
    ],
)
def test_solicitante_nao_faz_acoes_da_ti_nem_no_proprio_chamado(cliente, como, estado, rota, corpo):
    resposta = cliente.post(f"/chamados/41/{rota}", headers=como(ANA), json=corpo)
    assert resposta.status_code == 403
    assert codigo(resposta) == "SEM_PERMISSAO"
    assert estado.chamados[41].status == "aguardando_usuario"


@pytest.mark.parametrize(
    ("metodo", "rota", "corpo"),
    [
        ("get", "/chamados/36/acoes", None),
        ("post", "/chamados/36/cancelar", {"motivo": "não é meu"}),
        ("post", "/chamados/36/mensagens", {"conteudo": "oi"}),
        ("post", "/chamados/36/lido", None),
        ("post", "/chamados/9999/cancelar", {"motivo": "não existe"}),
    ],
)
def test_ana_no_chamado_do_bruno_ou_inexistente_recebe_o_mesmo_sem_permissao(
    cliente, como, metodo, rota, corpo
):
    resposta = getattr(cliente, metodo)(
        rota, headers=como(ANA), **({"json": corpo} if corpo else {})
    )
    assert resposta.status_code == 403
    assert codigo(resposta) == "SEM_PERMISSAO"


def test_ti_com_numero_inexistente_recebe_nao_encontrado(cliente, como):
    resposta = cliente.get("/chamados/9999/acoes", headers=como(RAFAEL))
    assert resposta.status_code == 404
    assert codigo(resposta) == "CHAMADO_NAO_ENCONTRADO"
    assert "#9999" in resposta.json()["erro"]["mensagem"]


def test_solicitante_cancela_so_antes_do_atendimento(cliente, como):
    depois = cliente.post(
        "/chamados/41/cancelar", headers=como(ANA), json={"motivo": "não preciso"}
    )
    assert codigo(depois) == "CANCELAMENTO_NAO_PERMITIDO"
    antes = cliente.post(
        "/chamados/42/cancelar", headers=como(ANA), json={"motivo": "voltou sozinho"}
    )
    assert antes.json()["status"] == "cancelado"


def test_perfil_inativo_e_barrado(cliente, como):
    assert codigo(cliente.get("/chamados/42/acoes", headers=como(INATIVO))) == "SEM_PERMISSAO"


def test_sem_login_da_sessao_expirada(cliente):
    assert codigo(cliente.post("/chamados/42/assumir")) == "SESSAO_EXPIRADA"


# ------------------------------------------------------------------------------- mensagens
def test_resposta_da_ana_volta_para_em_atendimento_e_avisa_o_tecnico(cliente, como, estado):
    resposta = cliente.post(
        "/chamados/41/mensagens", headers=como(ANA), json={"conteudo": "Testei, funciona!"}
    )
    assert resposta.status_code == 201
    assert estado.chamados[41].status == "em_andamento"
    assert estado.eventos[-1].acao == "status_alterado" and estado.eventos[-1].autor_id is None
    assert [(n.tipo, n.destinatario_id) for n in estado.notificacoes] == [("nova_mensagem", RAFAEL)]


def test_nota_interna_so_da_ti_e_nao_avisa_ninguem(cliente, como, estado):
    ana = cliente.post(
        "/chamados/41/mensagens", headers=como(ANA), json={"conteudo": "x", "interna": True}
    )
    assert codigo(ana) == "SEM_PERMISSAO"
    rafael = cliente.post(
        "/chamados/41/mensagens",
        headers=como(RAFAEL),
        json={"conteudo": "anotação", "interna": True},
    )
    assert rafael.status_code == 201
    assert estado.notificacoes == []


def test_mensagem_vazia_sem_anexo(cliente, como):
    assert codigo(
        cliente.post("/chamados/42/mensagens", headers=como(ANA), json={"conteudo": "  "})
    ) == ("CAMPO_OBRIGATORIO")


def test_lido_guarda_a_ultima_mensagem_visivel(cliente, como, estado):
    assert cliente.post("/chamados/41/lido", headers=como(ANA)).status_code == 204
    # A nota interna (mais antiga) não conta; a última visível para a Ana é a mensagem 2.
    assert estado.leituras[(41, ANA)] == estado.mensagens[1].criado_em


def test_anexo_de_nota_interna_nao_abre_para_a_ana(cliente, como, estado, storage):
    upload_id = _subir(cliente, como, storage, RAFAEL)
    cliente.post(
        "/chamados/41/mensagens",
        headers=como(RAFAEL),
        json={
            "conteudo": "print interno",
            "interna": True,
            "anexos": [{"upload_id": upload_id, "nome": "p.png"}],
        },
    )
    anexo_id = estado.anexos[-1].id
    assert codigo(cliente.get(f"/anexos/{anexo_id}/url", headers=como(ANA))) == "SEM_PERMISSAO"
    rafael = cliente.get(f"/anexos/{anexo_id}/url", headers=como(RAFAEL))
    assert rafael.status_code == 200 and "expira=60" in rafael.json()["url"]
    invalido = cliente.get("/anexos/temporarios..segredo/url", headers=como(RAFAEL))
    assert codigo(invalido) == "SEM_PERMISSAO"
