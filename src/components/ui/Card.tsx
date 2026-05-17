import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-ink/10 bg-white p-4 shadow-soft ${className}`}>{children}</section>;
}
