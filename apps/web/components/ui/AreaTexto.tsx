import { useId, type TextareaHTMLAttributes } from "react";

export interface AreaTextoProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  rotulo: string;
  ajuda?: string;
  erro?: string;
}

/** Texto longo com rótulo, ajuda e erro inline (mesmo visual do Campo). */
export function AreaTexto({
  rotulo,
  ajuda,
  erro,
  required,
  className = "",
  id: idInformado,
  rows = 4,
  ...props
}: AreaTextoProps) {
  const idGerado = useId();
  const id = idInformado ?? idGerado;
  const idAjuda = `${id}-ajuda`;
  const idErro = `${id}-erro`;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="font-semibold">
        {rotulo}
        {required ? <span className="text-perigo"> *</span> : null}
      </label>
      <textarea
        id={id}
        rows={rows}
        required={required}
        aria-invalid={erro ? true : undefined}
        aria-describedby={
          [ajuda ? idAjuda : null, erro ? idErro : null].filter(Boolean).join(" ") || undefined
        }
        className={`min-h-28 rounded-xl border bg-superficie px-4 py-3 text-base leading-relaxed placeholder:text-texto-suave ${erro ? "border-perigo" : "border-borda"}`}
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
