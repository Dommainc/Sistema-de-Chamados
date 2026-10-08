"use client";

import { ChevronLeft, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { useToast } from "@/components/ui/Toast";
import { useConsulta, useDados, useUsuario } from "@/lib/dados/provedor";
import type { FonteDeDados } from "@/lib/dados/tipos";
import { CHAVE_TITULO, ROTULO_TITULO, TITULO_MAX } from "@/lib/dominio/formulario";
import type { CampoForm, Categoria } from "@/lib/dominio/tipos";
import { ErroApp } from "@/lib/erros/catalogo";
import { formatarNumeroChamado } from "@/lib/formato";
import { caminhosAbertura, comReferente, type CaminhosAbertura } from "@/lib/rotas";
import { CampoDinamico, idDoCampo } from "./CampoDinamico";
import { lerRascunho, limparRascunho, salvarRascunho, type RascunhoTexto } from "./rascunho";
import { SeletorAnexos } from "./SeletorAnexos";
import { imagensColadas, useArquivosSelecionados } from "./useArquivos";

/** Passo 2 do "Abrir chamado" (mockup, tela 2). */
export function FormularioChamado({
  categoriaId,
  referente,
}: {
  categoriaId: number;
  referente: number | null;
}) {
  const caminhos = caminhosAbertura(useUsuario().papel);
  const consultar = useCallback(
    async (fonte: FonteDeDados) => {
      const [categorias, campos] = await Promise.all([
        fonte.listarCategorias(),
        fonte.listarCamposForm(categoriaId),
      ]);
      const categoria = categorias.find((c) => c.id === categoriaId) ?? null;
      return { categoria, campos };
    },
    [categoriaId],
  );
  const { dados, carregando, erro } = useConsulta(consultar);
  const voltar = comReferente(caminhos.inicio, referente);

  if (carregando) return <p className="p-6 text-texto-suave">Carregando...</p>;
  if (erro || !dados?.categoria) {
    return (
      <div className="flex flex-col items-center gap-4 p-10 text-center">
        <p className="text-lg">Esse assunto não está disponível.</p>
        <Link href={voltar} className="font-semibold text-primaria underline">
          Escolher outro assunto
        </Link>
      </div>
    );
  }
  // Montado só depois de carregar (já no navegador): pode ler o rascunho sem divergir do servidor.
  return (
    <FormularioCarregado
      categoria={dados.categoria}
      campos={dados.campos}
      caminhos={caminhos}
      referente={referente}
      voltar={voltar}
    />
  );
}

function rascunhoInicial(referente: number | null): RascunhoTexto {
  const r = lerRascunho();
  if (referente && !r.titulo) {
    return { ...r, titulo: `Referente ao chamado ${formatarNumeroChamado(referente)}: ` };
  }
  return r;
}

function FormularioCarregado({
  categoria,
  campos,
  caminhos,
  referente,
  voltar,
}: {
  categoria: Categoria;
  campos: CampoForm[];
  caminhos: CaminhosAbertura;
  referente: number | null;
  voltar: string;
}) {
  const router = useRouter();
  const fonte = useDados();
  const { mostrarErro } = useToast();
  const [rascunho, setRascunho] = useState<RascunhoTexto>(() => rascunhoInicial(referente));
  const [erros, setErros] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const { arquivos, adicionar, remover } = useArquivosSelecionados();

  function mudar(proximo: RascunhoTexto, chaveEditada: string) {
    setRascunho(proximo);
    salvarRascunho(proximo);
    if (erros[chaveEditada]) {
      setErros((atuais) => {
        const proximos = { ...atuais };
        delete proximos[chaveEditada];
        return proximos;
      });
    }
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setErros({});
    try {
      const criado = await fonte.criarChamado({
        categoriaId: categoria.id,
        titulo: rascunho.titulo,
        respostas: rascunho.respostas,
        anexos: arquivos.map(({ arquivo, nome, mime, tamanho, origem }) => ({
          arquivo,
          nome,
          mime,
          tamanho,
          origem,
        })),
      });
      limparRascunho();
      router.replace(caminhos.pronto(criado.id));
    } catch (e) {
      setEnviando(false);
      if (e instanceof ErroApp && e.campos.length > 0) {
        setErros(Object.fromEntries(e.campos.map((c) => [c.campo, c.mensagem])));
        const primeiro = e.campos[0].campo;
        document
          .getElementById(primeiro === CHAVE_TITULO ? "campo-titulo" : idDoCampo(primeiro))
          ?.focus();
        return;
      }
      mostrarErro(e);
    }
  }

  return (
    <form
      onSubmit={enviar}
      noValidate
      onPaste={(e) => {
        // Ctrl+V com imagem em qualquer lugar do formulário vira anexo; texto cola normalmente.
        const imagens = imagensColadas(e.clipboardData);
        if (imagens.length === 0) return;
        e.preventDefault();
        adicionar(imagens, "colado");
      }}
      className="flex flex-1 flex-col"
    >
      <div className="flex items-center justify-between border-b border-borda bg-superficie px-4 py-2 md:px-8">
        <Link
          href={voltar}
          className="inline-flex min-h-11 items-center gap-1 font-semibold text-primaria"
        >
          <ChevronLeft aria-hidden="true" className="size-5" /> Voltar
        </Link>
        <span className="text-sm font-semibold text-texto-suave">Passo 2 de 3</span>
      </div>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 lg:grid lg:grid-cols-[minmax(0,44rem)_20rem] lg:justify-between lg:gap-10">
        <div className="flex flex-col gap-6">
          {/* Sem "Trocar assunto": o "Voltar" lá em cima já leva à escolha (pedido do dono, 2026-10-08). */}
          <div>
            <span className="rounded-lg bg-primaria-suave px-3 py-1 text-sm font-semibold text-primaria">
              {categoria.nomeCurto}
            </span>
          </div>
          <h1 className="text-2xl font-bold">Conte o que está acontecendo</h1>

          <Campo
            id="campo-titulo"
            rotulo={ROTULO_TITULO}
            required
            maxLength={TITULO_MAX}
            ajuda={'Uma frase curta. Ex.: "Impressora do 3º andar não imprime".'}
            value={rascunho.titulo}
            erro={erros[CHAVE_TITULO]}
            onChange={(e) => mudar({ ...rascunho, titulo: e.target.value }, CHAVE_TITULO)}
          />

          {campos.map((campo) => (
            <CampoDinamico
              key={campo.id}
              campo={campo}
              valor={rascunho.respostas[campo.chave]}
              erro={erros[campo.chave]}
              aoMudar={(valor) =>
                mudar(
                  { ...rascunho, respostas: { ...rascunho.respostas, [campo.chave]: valor } },
                  campo.chave,
                )
              }
            />
          ))}

          <SeletorAnexos arquivos={arquivos} aoAdicionar={adicionar} aoRemover={remover} />

          {/* Envio no fim do formulário, abaixo do último campo (ajuste do Renato, 2026-10-08). */}
          <Botao type="submit" carregando={enviando} larguraTotal className="min-h-13 text-lg">
            Enviar chamado
          </Botao>
        </div>

        {/* Computador: resumo ao lado do formulário (o envio fica no fim do formulário). */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 flex flex-col gap-4 rounded-2xl border border-borda bg-superficie p-5 shadow-sm">
            <div>
              <p className="text-sm text-texto-suave">Assunto</p>
              <p className="font-semibold">{categoria.nomeCurto}</p>
            </div>
            <div className="flex gap-2">
              <Clock aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primaria" />
              <div>
                <p className="text-sm text-texto-suave">Previsão de conclusão</p>
                <p className="text-sm font-semibold">Aguardando análise da TI</p>
              </div>
            </div>
            {arquivos.length > 0 ? (
              <p className="text-sm text-texto-suave">
                {arquivos.length === 1
                  ? "1 arquivo anexado"
                  : `${arquivos.length} arquivos anexados`}
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </form>
  );
}
