import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`liquid-glass-surface mobile-section mobile-surface rounded-lg border border-ink/10 bg-white p-4 shadow-soft ${className}`}>{children}</section>;
}
