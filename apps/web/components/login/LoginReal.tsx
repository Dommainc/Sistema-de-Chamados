"use client";

import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Aviso } from "@/components/ui/Aviso";
import { chamarApi } from "@/lib/dados/real/api";
import { USUARIOS_SIMULADOS } from "@/lib/dados/simulada/usuarios";
import type { Papel } from "@/lib/dominio/tipos";
import { ErroApp, mensagemErro } from "@/lib/erros/catalogo";
import { inicioDoPapel } from "@/lib/rotas";
import { LOGIN_DEV } from "@/lib/supabase/config";
import { clienteNavegador } from "@/lib/supabase/navegador";

/** Senha dos usuários de teste do supabase/seed.dev.sql (só local e CI — nunca na nuvem). */
const SENHA_TESTE = "teste123";

const MOTIVOS: Record<string, string> = {
  sessao: mensagemErro("SESSAO_EXPIRADA"),
  falha: "Não foi possível entrar agora. Tente de novo; se continuar, fale com a TI.",
};

/**
 * Login da camada `real`: "Entrar com a conta Microsoft" (Entra ID — provider Azure do Supabase). Com
 * NEXT_PUBLIC_LOGIN_DEV=true (local/CI) aparecem também os usuários de teste; o next.config.ts recusa isso em produção.
 */
export function LoginReal({ motivo }: { motivo?: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(motivo ? (MOTIVOS[motivo] ?? null) : null);

  async function entrarMicrosoft() {
    setEnviando(true);
    setErro(null);
    const { error } = await clienteNavegador().auth.signInWithOAuth({
      provider: "azure",
      options: {
        scopes: "openid profile email",
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setErro(MOTIVOS.falha);
      setEnviando(false);
    }
  }

  async function entrarTeste(email: string) {
    setEnviando(true);
    setErro(null);
    const supabase = clienteNavegador();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: SENHA_TESTE,
    });
    if (error || !data.session) {
      setErro(MOTIVOS.falha);
      setEnviando(false);
      return;
    }
    try {
      const perfil = await chamarApi<{ papel: Papel }>("/auth/sincronizar", {
        metodo: "POST",
        token: data.session.access_token,
      });
      router.replace(inicioDoPapel(perfil.papel));
      router.refresh();
    } catch (e) {
      setErro(e instanceof ErroApp ? e.message : MOTIVOS.falha);
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {erro ? <Aviso titulo={erro} /> : null}
      <button
        type="button"
        onClick={entrarMicrosoft}
        disabled={enviando}
        className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-primaria px-4 text-lg font-semibold text-sobre-primaria hover:bg-primaria-forte disabled:opacity-60"
      >
        <LogIn aria-hidden="true" className="size-5" />
        Entrar com a conta Microsoft
      </button>
      <p className="text-center text-sm text-texto-suave">
        Use a sua conta da DOMMA (@dommainc.com.br).
      </p>

      {LOGIN_DEV ? (
        <div className="flex flex-col gap-2 border-t border-borda pt-4">
          <p className="text-sm font-semibold text-alerta">
            Só no ambiente de teste: entrar como usuário de teste
          </p>
          {USUARIOS_SIMULADOS.map((u) => (
            <button
              key={u.id}
              type="button"
              disabled={enviando}
              onClick={() => entrarTeste(u.email)}
              className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-borda bg-superficie px-4 py-2 text-left hover:border-primaria hover:bg-primaria-suave disabled:opacity-60"
            >
              <Avatar nome={u.nome} tom={u.papel === "ti" ? "escuro" : "primaria"} />
              <span className="flex flex-col">
                <span className="font-semibold">{u.nome}</span>
                <span className="text-sm text-texto-suave">{u.email}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
