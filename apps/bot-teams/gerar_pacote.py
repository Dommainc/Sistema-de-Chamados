"""Gera o pacote do app "Central de Chamados" para o Teams (docs/runbooks/bot-teams.md).

Uso (na raiz do repositório):
    python apps/bot-teams/gerar_pacote.py --app-id <BOT_APP_ID> --central https://<domínio>

Sai em apps/bot-teams/dist/central-chamados-teams.zip (manifest.json + ícones), que o admin do Teams sobe em
"Gerenciar apps → Carregar um app". O App ID não é segredo, mas fica fora do Git (dist/ é ignorado).
Precisa do Pillow (pip install pillow) só para desenhar os ícones a partir da logo.
"""

from __future__ import annotations

import argparse
import json
import zipfile
from pathlib import Path
from urllib.parse import urlparse

from PIL import Image

AQUI = Path(__file__).parent
LOGO = AQUI.parent / "web" / "public" / "logo-domma.png"
AZUL = (0x1F, 0x4E, 0x8C, 255)  # --cor-primaria


def logo_branca(largura: int) -> Image.Image:
    """A logo é branca com fundo transparente: só redimensiona mantendo a proporção."""
    logo = Image.open(LOGO).convert("RGBA")
    altura = round(logo.height * largura / logo.width)
    return logo.resize((largura, altura), Image.LANCZOS)


def icone_colorido() -> Image.Image:
    fundo = Image.new("RGBA", (192, 192), AZUL)
    logo = logo_branca(150)
    fundo.alpha_composite(logo, ((192 - logo.width) // 2, (192 - logo.height) // 2))
    return fundo


def icone_contorno() -> Image.Image:
    # Teams pede 32x32, branco sobre transparente.
    fundo = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    logo = logo_branca(30)
    fundo.alpha_composite(logo, ((32 - logo.width) // 2, (32 - logo.height) // 2))
    return fundo


def manifesto(app_id: str, central: str) -> dict:
    dominio = urlparse(central).netloc
    return {
        "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.17/MicrosoftTeams.schema.json",
        "manifestVersion": "1.17",
        "version": "1.0.1",
        "id": app_id,
        "developer": {
            "name": "DOMMA Incorporações — TI",
            "websiteUrl": central,
            "privacyUrl": central,
            "termsOfUseUrl": central,
        },
        "name": {"short": "Portal de Chamados", "full": "Portal de Chamados — DOMMA"},
        "description": {
            "short": "Avisos dos seus chamados de TI.",
            "full": (
                "Avisa quando a TI recebe, começa a atender, responde ou conclui o seu chamado na Central de "
                "Chamados da DOMMA. Para conversar sobre o chamado, use o botão do aviso: as mensagens enviadas "
                "aqui não são lidas pela equipe de TI."
            ),
        },
        "icons": {"color": "color.png", "outline": "outline.png"},
        "accentColor": "#1F4E8C",
        "bots": [
            {
                "botId": app_id,
                "scopes": ["personal"],
                "supportsFiles": False,
                "isNotificationOnly": True,  # só avisos: ninguém escreve para o bot
            }
        ],
        "permissions": ["identity", "messageTeamMembers"],
        "validDomains": [dominio],
    }


def main() -> None:
    args = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    args.add_argument("--app-id", required=True, help="Application (client) ID do bot")
    args.add_argument("--central", required=True, help="Endereço da Central, ex.: https://...vercel.app")
    opcoes = args.parse_args()
    central = opcoes.central.rstrip("/")

    destino = AQUI / "dist"
    destino.mkdir(exist_ok=True)
    icone_colorido().save(destino / "color.png")
    icone_contorno().save(destino / "outline.png")
    (destino / "manifest.json").write_text(
        json.dumps(manifesto(opcoes.app_id, central), ensure_ascii=False, indent=2), encoding="utf-8"
    )
    pacote = destino / "central-chamados-teams.zip"
    with zipfile.ZipFile(pacote, "w", zipfile.ZIP_DEFLATED) as z:
        for nome in ("manifest.json", "color.png", "outline.png"):
            z.write(destino / nome, nome)
    print(f"Pacote pronto: {pacote}")


if __name__ == "__main__":
    main()
