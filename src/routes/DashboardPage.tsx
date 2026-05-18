import { Droplets, Edit2, GlassWater, Trash2 } from "lucide-react";
import { useState } from "react";
import { AddFoodLogForm } from "../components/forms/AddFoodLogForm";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { ProgressRing } from "../components/ui/ProgressRing";
import { useAuth } from "../features/auth/AuthContext";
import { createFoodLog, deleteFoodLog, updateFoodLogGrams } from "../features/logs/logService";
import { submitDailyWeight } from "../features/profile/profileService";
import { useProfile } from "../features/profile/ProfileContext";
import { createWaterLog, deleteWaterLog } from "../features/water/waterService";
import { useFoodLogsByDate } from "../hooks/useFoodLogs";
import { useFoods } from "../hooks/useFoods";
import { useWaterGlasses, useWaterLogsByDate } from "../hooks/useWater";
import { calculateDailyWaterTargetLiter, sumDailyTotals, sumWaterMilliliters } from "../utils/calculations";
import { getTodayDateKey } from "../utils/date";
import type { FoodLog, WaterGlassSize } from "../types";

const waterGlassIconSize: Record<WaterGlassSize, string> = {
  small: "h-7 w-7",
  medium: "h-9 w-9",
  large: "h-11 w-11",
};

export function DashboardPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { foods } = useFoods();
  const todayDateKey = getTodayDateKey();
  const { glasses } = useWaterGlasses();
  const { logs, loading, error } = useFoodLogsByDate(todayDateKey);
  const { logs: waterLogs, loading: waterLoading, error: waterError } = useWaterLogsByDate(todayDateKey);
  const [editingLog, setEditingLog] = useState<FoodLog | null>(null);
  const [addingWaterGlassId, setAddingWaterGlassId] = useState<string | null>(null);
  const [grams, setGrams] = useState("");
  const [quickWeight, setQuickWeight] = useState("");
  const totals = sumDailyTotals(logs);
  const waterTotalMl = sumWaterMilliliters(waterLogs);
  const waterTargetLiter = calculateDailyWaterTargetLiter(profile?.currentWeight ?? 0);
  const waterTotalLiter = Math.round((waterTotalMl / 1000) * 10) / 10;
  const waterCountsByGlass = waterLogs.reduce<Record<string, number>>((acc, log) => {
    acc[log.glassId] = (acc[log.glassId] ?? 0) + 1;
    return acc;
  }, {});

  if (!user || !profile) return null;

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h2 className="text-2xl font-black text-ink">Bugün</h2>
          <p className="text-sm text-ink/60">Günlük tüketim, hedef ve hızlı kilo düzenleme.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Input label="Güncel kilo" type="number" step="0.1" value={quickWeight} placeholder={`${profile.currentWeight} kg`} onChange={(event) => setQuickWeight(event.target.value)} />
          <Button
            variant="secondary"
            icon={<Edit2 className="h-4 w-4" />}
            onClick={async () => {
              const value = Number(quickWeight);
              if (value > 0) {
                await submitDailyWeight(user.uid, value, profile.targetWeight);
                setQuickWeight("");
              }
            }}
          >
            Güncelle
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ProgressRing label="Kalori" value={totals.calories} target={profile.dailyCalorieTarget} unit="kcal" tone="leaf" />
        <ProgressRing label="Protein" value={totals.protein} target={profile.proteinTargetGram} unit="g" tone="coral" />
        <ProgressRing label="Yağ" value={totals.fat} target={profile.minFatTargetGram} unit="g" tone="amber" minimum />
        <ProgressRing label="Karbonhidrat" value={totals.carbs} target={profile.minCarbTargetGram} unit="g" tone="ink" minimum />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ProgressRing label="Su" value={waterTotalLiter} target={waterTargetLiter} unit="L" tone="leaf" />
        <Card className="sm:col-span-1 xl:col-span-3">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-mint text-leaf">
              <Droplets className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-ink">Su Ekle</h3>
              <p className="mt-1 text-sm text-ink/60">Günlük ihtiyaç: kilo / 25 = {waterTargetLiter} L.</p>
              <div className="mt-4">
                {glasses.length ? (
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {glasses.map((glass) => {
                      const size = glass.size ?? "medium";
                      const consumedCount = waterCountsByGlass[glass.id] ?? 0;
                      return (
                        <Button
                          key={glass.id}
                          type="button"
                          variant="secondary"
                          loading={addingWaterGlassId === glass.id}
                          className="relative min-h-24 flex-col px-3 py-3"
                          icon={<GlassWater className={`${waterGlassIconSize[size]} text-leaf`} />}
                          onClick={async () => {
                            setAddingWaterGlassId(glass.id);
                            try {
                              await createWaterLog(user.uid, glass);
                            } finally {
                              setAddingWaterGlassId(null);
                            }
                          }}
                        >
                          {consumedCount ? (
                            <span className="absolute right-2 top-2 rounded-full bg-leaf px-2 py-0.5 text-xs font-black text-white">
                              {consumedCount}x
                            </span>
                          ) : null}
                          <span className="text-center leading-tight">
                            {glass.name}
                            <span className="block text-xs font-medium text-ink/60">{glass.milliliters} ml</span>
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState title="Henüz bardak eklenmemiş" description="Yemekler sayfasından bardak ölçüsü ekleyince buradan su kaydı oluşturabilirsin." />
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <h3 className="text-lg font-bold text-ink">Yemek Ekle</h3>
          <div className="mt-4">
            {foods.length ? (
              <AddFoodLogForm foods={foods} onAdd={(food, amount) => createFoodLog(user.uid, food, amount)} />
            ) : (
              <EmptyState title="Henüz yemek eklenmemiş" description="Yemekler sayfasından besin ekleyince burada tüketim kaydı oluşturabilirsin." />
            )}
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-bold text-ink">Kilo</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-md bg-mint p-3">
              <p className="text-xs font-semibold text-leaf">Güncel</p>
              <p className="mt-1 text-2xl font-black text-ink">{profile.currentWeight} kg</p>
            </div>
            <div className="rounded-md bg-amberSoft/25 p-3">
              <p className="text-xs font-semibold text-ink/60">Hedef</p>
              <p className="mt-1 text-2xl font-black text-ink">{profile.targetWeight} kg</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="text-lg font-bold text-ink">Bugün tüketilenler</h3>
        {error ? <p className="mt-3 text-sm font-medium text-coral">{error}</p> : null}
        {loading ? <p className="mt-3 text-sm text-ink/60">Kayıtlar yükleniyor...</p> : null}
        {!loading && !logs.length ? <EmptyState title="Bugün kayıt yok" description="İlk öğününü eklediğinde günlük toplamların otomatik güncellenir." /> : null}
        <div className="mt-4 grid gap-2">
          {logs.map((log) => (
            <div key={log.id} className="grid gap-3 rounded-md border border-ink/10 p-3 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="font-semibold text-ink">{log.foodNameSnapshot}</p>
                {editingLog?.id === log.id ? (
                  <div className="mt-2 flex max-w-xs gap-2">
                    <Input label="Gram" type="number" step="0.1" value={grams} onChange={(event) => setGrams(event.target.value)} />
                    <Button
                      className="self-end"
                      onClick={async () => {
                        await updateFoodLogGrams(user.uid, log, foods.find((food) => food.id === log.foodId), Number(grams));
                        setEditingLog(null);
                      }}
                    >
                      Kaydet
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-ink/60">
                    {log.grams} g · {log.calories} kcal · P {log.protein} g · Y {log.fat} g · K {log.carbs} g
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" icon={<Edit2 className="h-4 w-4" />} onClick={() => { setEditingLog(log); setGrams(String(log.grams)); }}>
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

      <Card>
        <h3 className="text-lg font-bold text-ink">Bugün içilen su</h3>
        {waterError ? <p className="mt-3 text-sm font-medium text-coral">{waterError}</p> : null}
        {waterLoading ? <p className="mt-3 text-sm text-ink/60">Su kayıtları yükleniyor...</p> : null}
        {!waterLoading && !waterLogs.length ? <EmptyState title="Bugün su kaydı yok" description="İçtiğin suyu bardak seçerek eklediğinde hedefin otomatik güncellenir." /> : null}
        <div className="mt-4 grid gap-2">
          {waterLogs.map((log) => (
            <div key={log.id} className="grid gap-3 rounded-md border border-ink/10 p-3 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="font-semibold text-ink">{log.glassNameSnapshot}</p>
                <p className="text-sm text-ink/60">
                  {log.milliliters} ml · {Math.round((log.milliliters / 1000) * 10) / 10} L
                </p>
              </div>
              <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => deleteWaterLog(user.uid, log.id)}>
                Sil
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
