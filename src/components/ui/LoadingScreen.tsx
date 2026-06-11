import { Loader2 } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="desktop-liquid-shell grid min-h-screen place-items-center bg-cloud">
      <div className="liquid-glass-surface flex items-center gap-3 rounded-lg bg-white px-5 py-4 shadow-soft">
        <Loader2 className="h-5 w-5 animate-spin text-leaf" />
        <span className="text-sm font-medium text-ink">Yükleniyor...</span>
      </div>
    </div>
  );
}
