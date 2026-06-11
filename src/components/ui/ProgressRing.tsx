import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

interface ProgressRingProps {
  label: string;
  value: number;
  target: number;
  unit: string;
  tone?: "leaf" | "coral" | "amber" | "ink";
  minimum?: boolean;
}

const tones = {
  leaf: "#2f7d5b",
  coral: "#ef7d63",
  amber: "#f5bd4f",
  ink: "#17201c",
};

export function ProgressRing({ label, value, target, unit, tone = "leaf", minimum }: ProgressRingProps) {
  const percent = target > 0 ? Math.round((value / target) * 100) : 0;
  const clamped = Math.min(percent, 100);
  const animatedValue = useAnimatedNumber(value, 860);
  const animatedPercent = Math.round(useAnimatedNumber(percent, 900));
  const animatedClamped = Math.min(animatedPercent, 100);
  const isMinimumApproved = Boolean(minimum && percent >= 100);
  const ringStyle = {
    "--ring-color": tones[tone],
    "--ring-progress": `${animatedClamped}%`,
    "--ring-target": `${clamped}%`,
    background: "conic-gradient(var(--ring-color) var(--ring-progress), rgba(232, 238, 233, 0.72) var(--ring-progress) 100%)",
  } as CSSProperties & Record<"--ring-color" | "--ring-progress" | "--ring-target", string>;

  return (
    <div className="liquid-glass-surface mobile-section mobile-surface progress-motion grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 overflow-hidden rounded-lg border border-ink/10 bg-white p-4">
      <div
        key={`${label}-${clamped}-${tone}-${isMinimumApproved ? "done" : "progress"}`}
        className="mobile-ring mobile-ring-fill grid h-24 w-24 shrink-0 place-items-center rounded-full"
        style={ringStyle}
      >
        <div className="grid h-16 w-16 place-items-center rounded-full bg-white text-center">
          {isMinimumApproved ? (
            <Check className="h-7 w-7 text-leaf" aria-label="Onaylandı" />
          ) : (
            <span className="text-lg font-bold text-ink">{animatedPercent}%</span>
          )}
        </div>
      </div>
      <div className="min-w-0">
        <p className="break-words font-semibold leading-tight text-ink">{label}</p>
        <p className="mt-1 text-sm text-ink/65">
          {formatAnimatedValue(animatedValue, value)} / {target.toLocaleString("tr-TR")} {unit}
        </p>
        <p className="mt-1 text-xs font-medium text-ink/50">{isMinimumApproved ? "Onaylandı" : minimum ? "Minimum hedef" : percent > 100 ? "Hedef aşıldı" : "Günlük hedef"}</p>
      </div>
    </div>
  );
}

function useAnimatedNumber(value: number, duration = 760) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValueRef = useRef(value);

  useEffect(() => {
    const previousValue = previousValueRef.current;
    previousValueRef.current = value;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayValue(value);
      return;
    }

    const start = performance.now();
    let frame = 0;

    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(previousValue + (value - previousValue) * eased);

      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    }

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [duration, value]);

  return Math.round(displayValue * 10) / 10;
}

function formatAnimatedValue(value: number, targetValue: number) {
  const shouldUseDecimal = !Number.isInteger(targetValue);

  return value.toLocaleString("tr-TR", {
    maximumFractionDigits: shouldUseDecimal ? 1 : 0,
    minimumFractionDigits: 0,
  });
}
