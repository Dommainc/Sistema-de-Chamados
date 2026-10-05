import { describe, expect, it } from "vitest";
import { ErroApp } from "@/lib/erros/catalogo";
import { formatarTamanho, mimeDoArquivo, nomeDoPrint, validarArquivo } from "./anexos";

function codigo(fn: () => void): string | null {
  try {
    fn();
    return null;
  } catch (e) {
    return (e as ErroApp).codigo;
  }
}

describe("validarArquivo", () => {
  it("aceita imagem, PDF e Office até 10 MB", () => {
    expect(codigo(() => validarArquivo({ tamanho: 1_800_000, mime: "image/jpeg" }))).toBeNull();
    expect(
      codigo(() => validarArquivo({ tamanho: 10 * 1024 * 1024, mime: "application/pdf" })),
    ).toBeNull();
  });

  it("11 MB → ANEXO_MUITO_GRANDE", () => {
    expect(codigo(() => validarArquivo({ tamanho: 11 * 1024 * 1024, mime: "image/png" }))).toBe(
      "ANEXO_MUITO_GRANDE",
    );
  });

  it(".exe → ANEXO_TIPO_INVALIDO", () => {
    expect(
      codigo(() => validarArquivo({ tamanho: 1000, mime: mimeDoArquivo("setup.exe", "") })),
    ).toBe("ANEXO_TIPO_INVALIDO");
    expect(codigo(() => validarArquivo({ tamanho: 1000, mime: "application/x-msdownload" }))).toBe(
      "ANEXO_TIPO_INVALIDO",
    );
  });
});

describe("mimeDoArquivo", () => {
  it("usa o tipo informado ou deduz pela extensão", () => {
    expect(mimeDoArquivo("foto.jpg", "image/jpeg")).toBe("image/jpeg");
    expect(mimeDoArquivo("IMG_001.HEIC", "")).toBe("image/heic");
    expect(mimeDoArquivo("sem-extensao", "")).toBe("");
  });
});

describe("nomeDoPrint", () => {
  // 05/10/2026 08:45:10 em São Paulo
  const quando = new Date("2026-10-05T11:45:10Z");

  it("segue o padrão print-AAAAMMDD-HHMMSS.png no horário de São Paulo", () => {
    expect(nomeDoPrint(quando, [])).toBe("print-20261005-084510.png");
  });

  it("vários prints no mesmo segundo ganham sufixo", () => {
    expect(nomeDoPrint(quando, ["print-20261005-084510.png"])).toBe("print-20261005-084510-2.png");
    expect(nomeDoPrint(quando, ["print-20261005-084510.png", "print-20261005-084510-2.png"])).toBe(
      "print-20261005-084510-3.png",
    );
  });
});

describe("formatarTamanho", () => {
  it("mostra MB com vírgula ou KB", () => {
    expect(formatarTamanho(1_887_437)).toBe("1,8 MB");
    expect(formatarTamanho(350 * 1024)).toBe("350 KB");
  });
});
