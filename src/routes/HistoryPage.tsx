import { ChevronLeft, ChevronRight, Edit2, Plus, Salad, Trash2, Utensils, X } from "lucide-react";
import { useState } from "react";
import { AddFoodLogForm } from "../components/forms/AddFoodLogForm";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { ProgressRing } from "../components/ui/ProgressRing";
import { useAuth } from "../features/auth/AuthContext";
import { createFoodLog, createPlateLog, deleteFoodLog, updateFoodLogEntry } from "../features/logs/logService";
import { useProfile } from "../features/profile/ProfileContext";
import { useFoodLogsByDate } from "../hooks/useFoodLogs";
import { useFoods } from "../hooks/useFoods";
import { usePlates } from "../hooks/usePlates";
import { useWaterLogsByDate } from "../hooks/useWater";
import { calculateDailyWaterTargetLiter, sumDailyTotals, sumWaterMilliliters } from "../utils/calculations";
import { addDays, formatDateKey, getTodayDateKey } from "../utils/date";
import type { FoodLog } from "../types";

export function HistoryPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { foods } = useFoods();
  const { plates } = usePlates();
  const [dateKey, setDateKey] = useState(getTodayDateKey());
  const [editingLog, setEditingLog] = useState<FoodLog | null>(null);
  const [editingFoodId, setEditingFoodId] = useState("");
  const [selectedPlateId, setSelectedPlateId] = useState("");
  const [platePortion, setPlatePortion] = useState("1");
  const [addingPlateId, setAddingPlateId] = useState<string | null>(null);
  const [grams, setGrams] = useState("");
  const { logs, loading, error } = useFoodLogsByDate(dateKey);
  const { logs: waterLogs, loading: waterLoading, error: waterError } = useWaterLogsByDate(dateKey);
  const totals = sumDailyTotals(logs);
  const waterTotalMl = sumWaterMilliliters(waterLogs);
  const waterTargetLiter = calculateDailyWaterTargetLiter(profile?.currentWeight ?? 0);
  const waterTotalLiter = Math.round((waterTotalMl / 1000) * 10) / 10;
  const selectedPlate = plates.find((plate) => plate.id === selectedPlateId);

  if (!user || !profile) return null;

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
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <ProgressRing label="Kalori" value={totals.calories} target={profile.dailyCalorieTarget} unit="kcal" tone="leaf" />
        <ProgressRing label="Protein" value={totals.protein} target={profile.proteinTargetGram} unit="g" tone="coral" />
        <ProgressRing label="Yağ" value={totals.fat} target={profile.minFatTargetGram} unit="g" tone="amber" minimum />
        <ProgressRing label="Karbonhidrat" value={totals.carbs} target={profile.minCarbTargetGram} unit="g" tone="ink" minimum />
        <ProgressRing label="Su" value={waterTotalLiter} target={waterTargetLiter} unit="L" tone="leaf" />
      </div>
      {waterError ? <p className="text-sm font-medium text-coral">{waterError}</p> : null}
      {waterLoading ? <p className="text-sm text-ink/60">Su kayıtları yükleniyor...</p> : null}
      <Card>
        <div className="flex items-center gap-2">
          <Salad className="h-5 w-5 text-leaf" />
          <h3 className="text-lg font-bold text-ink">{formatDateKey(dateKey)} için yemek ekle</h3>
        </div>
        <div className="mt-4">
          {foods.length ? (
            <AddFoodLogForm foods={foods} onAdd={(food, amount) => createFoodLog(user.uid, food, amount, dateKey)} />
          ) : (
            <EmptyState title="Henüz yemek eklenmemiş" description="Yemekler sayfasından besin ekleyince geçmiş tarihlere de kayıt oluşturabilirsin." />
          )}
        </div>
      </Card>
      <Card>
        <div className="flex items-center gap-2">
          <Utensils className="h-5 w-5 text-leaf" />
          <h3 className="text-lg font-bold text-ink">{formatDateKey(dateKey)} için tabak ekle</h3>
        </div>
        <div className="mt-4">
          {plates.length ? (
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_auto] md:items-end">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink/80">Tabak</span>
                <select
                  className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-mint"
                  value={selectedPlateId}
                  onChange={(event) => setSelectedPlateId(event.target.value)}
                >
                  <option value="">Tabak seç</option>
                  {plates.map((plate) => (
                    <option key={plate.id} value={plate.id}>
                      {plate.name} · {plate.calories} kcal
                    </option>
                  ))}
                </select>
                {selectedPlate ? (
                  <span className="mt-1 block text-xs text-ink/55">
                    {selectedPlate.totalGrams} g · P {selectedPlate.protein} g · Y {selectedPlate.fat} g · K {selectedPlate.carbs} g
                  </span>
                ) : null}
              </label>
              <Input
                label="Porsiyon"
                type="number"
                step="0.1"
                min="0.1"
                value={platePortion}
                onChange={(event) => setPlatePortion(event.target.value)}
                onFocus={(event) => {
                  if (event.currentTarget.value === "1") {
                    setPlatePortion("");
                  }
                }}
              />
              <Button
                type="button"
                loading={addingPlateId === selectedPlateId}
                icon={<Plus className="h-4 w-4" />}
                onClick={async () => {
                  const portion = Number(platePortion);
                  if (!selectedPlate || portion <= 0) return;

                  setAddingPlateId(selectedPlate.id);
                  try {
                    await createPlateLog(user.uid, selectedPlate, portion, dateKey);
                    setSelectedPlateId("");
                    setPlatePortion("1");
                  } finally {
                    setAddingPlateId(null);
                  }
                }}
              >
                Ekle
              </Button>
            </div>
          ) : (
            <EmptyState title="Henüz tabak eklenmemiş" description="Tabak sayfasından kombinasyon kaydedince geçmiş tarihlere de tabak ekleyebilirsin." />
          )}
        </div>
      </Card>
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
                {editingLog?.id === log.id ? (
                  <div className="mt-2 grid max-w-2xl gap-2 sm:grid-cols-[minmax(0,1fr)_120px_auto_auto] sm:items-end">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-ink/80">Yemek</span>
                      <select
                        className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-mint"
                        value={editingFoodId}
                        onChange={(event) => setEditingFoodId(event.target.value)}
                      >
                        {foods.some((food) => food.id === editingFoodId) ? null : <option value={editingFoodId}>{log.foodNameSnapshot}</option>}
                        {foods.map((food) => (
                          <option key={food.id} value={food.id}>
                            {food.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Input label="Gram" type="number" step="0.1" min="0.1" value={grams} onChange={(event) => setGrams(event.target.value)} />
                    <Button
                      onClick={async () => {
                        const nextGrams = Number(grams);
                        if (nextGrams <= 0) return;

                        await updateFoodLogEntry(user.uid, log, foods.find((food) => food.id === editingFoodId), nextGrams);
                        setEditingLog(null);
                        setEditingFoodId("");
                        setGrams("");
                      }}
                    >
                      Kaydet
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      icon={<X className="h-4 w-4" />}
                      onClick={() => {
                        setEditingLog(null);
                        setEditingFoodId("");
                        setGrams("");
                      }}
                    >
                      Vazgeç
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-ink/60">
                    {log.grams} g · {log.calories} kcal · P {log.protein} g · Y {log.fat} g · K {log.carbs} g
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <Button
                  variant="ghost"
                  icon={<Edit2 className="h-4 w-4" />}
                  onClick={() => {
                    setEditingLog(log);
                    setEditingFoodId(log.foodId);
                    setGrams(String(log.grams));
                  }}
                >
                  Düzenle
                </Button>
                <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => deleteFoodLog(user.uid, log.id)}>
                  Sil
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
