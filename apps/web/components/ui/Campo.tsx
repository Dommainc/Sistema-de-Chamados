import { useId, type InputHTMLAttributes } from "react";

export interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
  rotulo: string;
  ajuda?: string;
  erro?: string;
}

/** Campo de texto com rótulo, ajuda e erro inline (vindo do catálogo). */
export function Campo({ rotulo, ajuda, erro, required, className = "", ...props }: CampoProps) {
  const id = useId();
  const idAjuda = `${id}-ajuda`;
  const idErro = `${id}-erro`;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="font-medium">
        {rotulo}
        {required ? <span className="text-perigo"> *</span> : null}
      </label>
      {ajuda ? (
        <p id={idAjuda} className="text-sm text-texto-suave">
          {ajuda}
        </p>
      ) : null}
      <input
        id={id}
        required={required}
        aria-invalid={erro ? true : undefined}
        aria-describedby={
          [ajuda ? idAjuda : null, erro ? idErro : null].filter(Boolean).join(" ") || undefined
        }
        className={`min-h-11 rounded-lg border bg-superficie px-3 py-2 text-base ${erro ? "border-perigo" : "border-borda"}`}
        {...props}
      />
      {erro ? (
        <p id={idErro} role="alert" className="text-sm text-perigo">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
