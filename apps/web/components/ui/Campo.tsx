import { useId, type InputHTMLAttributes } from "react";

export interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
  rotulo: string;
  /** Texto de apoio, exibido abaixo do campo (mockup: "Uma frase curta. Ex.: ..."). */
  ajuda?: string;
  /** Mensagem de erro do catálogo, exibida inline. */
  erro?: string;
}

/** Campo de texto com rótulo, ajuda e erro inline. */
export function Campo({ rotulo, ajuda, erro, required, className = "", ...props }: CampoProps) {
  const id = useId();
  const idAjuda = `${id}-ajuda`;
  const idErro = `${id}-erro`;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="font-semibold">
        {rotulo}
        {required ? <span className="text-perigo"> *</span> : null}
      </label>
      <input
        id={id}
        required={required}
        aria-invalid={erro ? true : undefined}
        aria-describedby={
          [ajuda ? idAjuda : null, erro ? idErro : null].filter(Boolean).join(" ") || undefined
        }
        className={`min-h-12 rounded-xl border bg-superficie px-4 py-2 text-base placeholder:text-texto-suave ${erro ? "border-perigo" : "border-borda"}`}
        {...props}
      />
      {ajuda ? (
        <p id={idAjuda} className="text-sm text-texto-suave">
          {ajuda}
        </p>
      ) : null}
      {erro ? (
        <p id={idErro} role="alert" className="text-sm font-medium text-perigo">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
