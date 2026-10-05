import { sair } from "@/app/acoes-sessao";

export function BotaoSair({ className = "" }: { className?: string }) {
  return (
    <form action={sair}>
      <button
        type="submit"
        className={`min-h-11 rounded-lg px-3 font-medium hover:bg-black/10 ${className}`}
      >
        Sair
      </button>
    </form>
  );
}
