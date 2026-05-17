import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, error, className = "", ...props }, ref) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink/80">{label}</span>
      <input
        ref={ref}
        className={`w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-leaf focus:ring-2 focus:ring-mint ${className}`}
        {...props}
      />
      {error ? <span className="mt-1 block text-xs font-medium text-coral">{error}</span> : null}
    </label>
  );
});
