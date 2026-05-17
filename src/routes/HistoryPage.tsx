import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { useAuth } from "../features/auth/AuthContext";
import { deleteFoodLog } from "../features/logs/logService";
import { useFoodLogsByDate } from "../hooks/useFoodLogs";
import { sumDailyTotals } from "../utils/calculations";
import { addDays, formatDateKey, getTodayDateKey } from "../utils/date";
import { useState } from "react";

export function HistoryPage() {
  const { user } = useAuth();
  const [dateKey, setDateKey] = useState(getTodayDateKey());
  const { logs, loading, error } = useFoodLogsByDate(dateKey);
  const totals = sumDailyTotals(logs);

  if (!user) return null;

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-2xl font-black text-ink">Geçmiş</h2>
        <p className="text-sm text-ink/60">Tarihe göre tüketim kayıtlarını incele.</p>
      </div>
      <Card>
        <div className="grid gap-3 md:grid-cols-[auto_220px_auto] md:items-end">
          <Button variant="secondary" icon={<ChevronLeft className="h-4 w-4" />} onClick={() => setDateKey(addDays(dateKey, -1))}>
            Önceki gün
          </Button>
          <Input label="Tarih" type="date" value={dateKey} onChange={(event) => setDateKey(event.target.value)} />
          <Button variant="secondary" icon={<ChevronRight className="h-4 w-4" />} onClick={() => setDateKey(addDays(dateKey, 1))}>
            Sonraki gün
          </Button>
        </div>
      </Card>
      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="Kalori" value={`${totals.calories} kcal`} />
        <Metric label="Protein" value={`${totals.protein} g`} />
        <Metric label="Yağ" value={`${totals.fat} g`} />
        <Metric label="Karbonhidrat" value={`${totals.carbs} g`} />
      </div>
      <Card>
        <h3 className="text-lg font-bold text-ink">{formatDateKey(dateKey)}</h3>
        {error ? <p className="mt-3 text-sm font-medium text-coral">{error}</p> : null}
        {loading ? <p className="mt-3 text-sm text-ink/60">Kayıtlar yükleniyor...</p> : null}
        {!loading && !logs.length ? <EmptyState title="Bu tarihte kayıt yok" /> : null}
        <div className="mt-4 grid gap-2">
          {logs.map((log) => (
            <div key={log.id} className="grid gap-3 rounded-md border border-ink/10 p-3 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="font-semibold text-ink">{log.foodNameSnapshot}</p>
                <p className="text-sm text-ink/60">
                  {log.grams} g · {log.calories} kcal · P {log.protein} g · Y {log.fat} g · K {log.carbs} g
                </p>
              </div>
              <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => deleteFoodLog(user.uid, log.id)}>
                Sil
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3">
      <p className="text-xs font-semibold text-ink/55">{label}</p>
      <p className="mt-1 text-xl font-black text-ink">{value}</p>
    </Card>
  );
}
