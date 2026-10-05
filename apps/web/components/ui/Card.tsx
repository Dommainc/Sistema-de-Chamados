import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-borda bg-superficie p-4 shadow-sm ${className}`}
      {...props}
    />
  );
}
