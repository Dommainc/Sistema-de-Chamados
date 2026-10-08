"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { useToast } from "@/components/ui/Toast";
import { useConsulta, useDados } from "@/lib/dados/provedor";
import type { FonteDeDados } from "@/lib/dados/tipos";
import { ErroApp } from "@/lib/erros/catalogo";

const consultarPerfil = (fonte: FonteDeDados) => fonte.obterMeuPerfil();

export function FormPrimeiroAcesso() {
  const router = useRouter();
  const fonte = useDados();
  const { mostrarErro } = useToast();
  const { dados: perfil } = useConsulta(consultarPerfil);
  const [departamento, setDepartamento] = useState("");
  const [errosCampo, setErrosCampo] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  // Cadastro já feito: não pergunta de novo.
  useEffect(() => {
    if (perfil?.departamento) router.replace("/");
  }, [perfil, router]);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setErrosCampo({});
    try {
      // Sem telefone: o contato com a TI é pelo Teams (ajuste do Renato, 2026-10-08).
      await fonte.atualizarMeuPerfil({ departamento, telefone: null });
      router.replace("/");
    } catch (erro) {
      if (erro instanceof ErroApp && erro.campos.length > 0) {
        setErrosCampo(Object.fromEntries(erro.campos.map((c) => [c.campo, c.mensagem])));
      } else {
        mostrarErro(erro);
      }
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
      <Campo
        rotulo="Departamento"
        name="departamento"
        required
        ajuda="Ex.: Financeiro, Engenharia, Obra Barra"
        value={departamento}
        onChange={(e) => setDepartamento(e.target.value)}
        erro={errosCampo.departamento}
      />
      <Botao type="submit" carregando={enviando} larguraTotal>
        Continuar
      </Botao>
    </form>
  );
}
