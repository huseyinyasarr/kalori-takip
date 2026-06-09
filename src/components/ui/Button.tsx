import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  icon?: ReactNode;
}

const variants = {
  primary: "bg-leaf text-white hover:bg-[#25694b] focus:ring-leaf",
  secondary: "bg-mint text-ink hover:bg-[#caebd6] focus:ring-leaf",
  ghost: "bg-transparent text-ink hover:bg-white focus:ring-leaf",
  danger: "bg-coral text-white hover:bg-[#dc6b51] focus:ring-coral",
};

export function Button({ children, variant = "primary", loading, icon, className = "", disabled, ...props }: ButtonProps) {
  return (
    <button
      className={`liquid-glass-button mobile-tap inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      data-variant={variant}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}
