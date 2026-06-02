import { useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { CaloriesChart, ProteinChart, WaterChart, WeightChart } from "../components/charts/TrackerCharts";
import { subscribeWeightLogsUntilDate } from "../features/history/weightService";
import { useAuth } from "../features/auth/AuthContext";
import { useProfile } from "../features/profile/ProfileContext";
import { useFoodLogsFromDate } from "../hooks/useFoodLogs";
import { useWaterLogsFromDate } from "../hooks/useWater";
import type { WeightLog } from "../types";
import { formatShortDate, getLastNCompletedDays, getMonthStartDateKey, getTodayDateKey } from "../utils/date";
import { calculateDailyWaterTargetLiter, calculateTargets, sumDailyTotals, sumWaterMilliliters } from "../utils/calculations";

export function SummaryPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const todayDateKey = getTodayDateKey();
  const monthStart = getMonthStartDateKey();
  const currentMonthLabel = new Intl.DateTimeFormat("tr-TR", { month: "long" }).format(new Date());
  const chartDays = useMemo(() => getLastNCompletedDays(30, todayDateKey), [todayDateKey]);
  const sevenDays = useMemo(() => chartDays.slice(-7), [chartDays]);
  const chartEndDateKey = chartDays[chartDays.length - 1] ?? todayDateKey;
  const { logs } = useFoodLogsFromDate(chartDays[0]);
  const { logs: waterLogs } = useWaterLogsFromDate(chartDays[0]);
  const [weights, setWeights] = useState<WeightLog[]>([]);

  useEffect(() => {
    if (!user) return;
    return subscribeWeightLogsUntilDate(user.uid, chartEndDateKey, setWeights, () => undefined);
  }, [chartEndDateKey, user]);

  const dailyData = useMemo(() => {
    const baseData = chartDays.map((date) => {
      const totals = sumDailyTotals(logs.filter((log) => log.dateKey === date));
      const weight = weights.find((item) => item.dateKey === date && item.weight !== null)?.weight ?? null;
      const effectiveWeight = weights.find((item) => item.dateKey <= date && item.weight !== null)?.weight ?? profile?.currentWeight ?? 0;
      const targets = profile ? calculateTargets(effectiveWeight, profile.targetWeight) : null;
      const waterLiter = Math.round((sumWaterMilliliters(waterLogs.filter((log) => log.dateKey === date)) / 1000) * 10) / 10;
      return {
        date,
        label: formatShortDate(date),
        ...totals,
        calorieTarget: targets?.dailyCalorieTarget,
        proteinTarget: targets?.proteinTargetGram,
        weight,
        waterLiter,
        waterTargetLiter: calculateDailyWaterTargetLiter(effectiveWeight),
      };
    });

    const calorieAverage = averagePositiveValues(baseData.map((item) => item.calories));
    const proteinAverage = averagePositiveValues(baseData.map((item) => item.protein), 1);
    const waterAverageLiter = averagePositiveValues(baseData.map((item) => item.waterLiter), 1);

    return baseData.map((item) => ({
      ...item,
      calorieAverage,
      proteinAverage,
      waterAverageLiter,
    }));
  }, [chartDays, logs, profile, waterLogs, weights]);

  const sevenDayLogs = logs.filter((log) => sevenDays.includes(log.dateKey));
  const monthLogs = logs.filter((log) => log.dateKey >= monthStart);
  const sevenTotals = sumDailyTotals(sevenDayLogs);
  const monthTotals = sumDailyTotals(monthLogs);
  const daysWithLogs = new Set(monthLogs.map((log) => log.dateKey)).size || 1;
  const sevenAverageCalories = Math.round(sevenTotals.calories / 7);
  const sevenAverageProtein = Math.round((sevenTotals.protein / 7) * 10) / 10;
  const monthAverageCalories = Math.round(monthTotals.calories / daysWithLogs);
  const monthAverageProtein = Math.round((monthTotals.protein / daysWithLogs) * 10) / 10;
  const compliance = profile?.dailyCalorieTarget ? Math.round((logs.filter((log) => log.calories <= profile.dailyCalorieTarget).length / Math.max(logs.length, 1)) * 100) : 0;

  return (
    <div className="grid gap-5">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-black text-ink">Özet</h2>
          <div className="group relative inline-flex">
            <button
              type="button"
              aria-label="Özet sayfası hakkında bilgi"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink/55 transition hover:bg-mint hover:text-ink focus:bg-mint focus:text-ink focus:outline-none focus:ring-2 focus:ring-leaf"
            >
              <Info className="h-4 w-4" />
            </button>
            <div className="pointer-events-none absolute left-0 top-10 z-10 w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-ink/10 bg-white p-3 text-justify text-xs font-medium leading-5 text-ink/70 opacity-0 shadow-soft transition group-hover:opacity-100 group-focus-within:opacity-100">
              Grafikler bugünü hariç tutar ve son 30 gün içindeki verileri gösterir. Grafiklerdeki kesik ortalama çizgileri, bu aralıkta 0 olmayan kalori, protein ve su değerlerinden hesaplanır. Son 7 gün kartları bugünü hariç son 7 günün ortalamasını; ay kartları ise mevcut ayda kayıt bulunan günlerin ortalamasını gösterir.
            </div>
          </div>
        </div>
        <p className="text-sm text-ink/60">Son günler, bu ay ve kilo değişimi.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Son 7 gün kalori ort." value={`${sevenAverageCalories} kcal`} />
        <Metric label="Son 7 gün protein ort." value={`${sevenAverageProtein} g`} />
        <Metric label={`${currentMonthLabel} ayı kalori ort.`} value={`${monthAverageCalories} kcal`} />
        <Metric label={`${currentMonthLabel} ayı protein ort.`} value={`${monthAverageProtein} g`} />
        <Metric label="Hedef uyumu" value={`${compliance}%`} />
      </div>
      {!logs.length && !waterLogs.length && !weights.length ? (
        <EmptyState title="Özet için veri yok" description="Yemek, su veya kilo kaydı eklendiğinde grafikler burada oluşur." />
      ) : null}
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-lg font-bold text-ink">Kalori tüketimi</h3>
          <CaloriesChart data={dailyData} />
        </Card>
        <Card>
          <h3 className="mb-4 text-lg font-bold text-ink">Protein tüketimi</h3>
          <ProteinChart data={dailyData} />
        </Card>
        <Card className="xl:col-span-2">
          <h3 className="mb-4 text-lg font-bold text-ink">Su tüketimi</h3>
          <WaterChart data={dailyData} />
        </Card>
        <Card className="xl:col-span-2">
          <h3 className="mb-4 text-lg font-bold text-ink">Kilo değişimi</h3>
          <WeightChart data={dailyData} />
        </Card>
      </div>
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

function averagePositiveValues(values: Array<number | undefined>, precision = 0) {
  const positiveValues = values.filter((value): value is number => typeof value === "number" && value > 0);
  if (!positiveValues.length) return undefined;

  const average = positiveValues.reduce((total, value) => total + value, 0) / positiveValues.length;
  const multiplier = 10 ** precision;
  return Math.round(average * multiplier) / multiplier;
}
