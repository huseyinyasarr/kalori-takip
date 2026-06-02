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
import { addDays, formatShortDate, getDateRangeKeys, getLastNCompletedDays, getMonthDateRangeKeys, getMonthStartDateKey, getTodayDateKey } from "../utils/date";
import { calculateDailyWaterTargetLiter, calculateTargets, sumDailyTotals, sumWaterMilliliters } from "../utils/calculations";

type ChartFilterMode = "last30" | "range" | "month";

export function SummaryPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const todayDateKey = getTodayDateKey();
  const yesterdayDateKey = addDays(todayDateKey, -1);
  const monthStart = getMonthStartDateKey();
  const currentMonthLabel = new Intl.DateTimeFormat("tr-TR", { month: "long" }).format(new Date());
  const currentMonthKey = todayDateKey.slice(0, 7);
  const defaultChartDays = useMemo(() => getLastNCompletedDays(30, todayDateKey), [todayDateKey]);
  const [chartFilterMode, setChartFilterMode] = useState<ChartFilterMode>("last30");
  const [rangeStartDateKey, setRangeStartDateKey] = useState(defaultChartDays[0]);
  const [rangeEndDateKey, setRangeEndDateKey] = useState(yesterdayDateKey);
  const [selectedMonthKey, setSelectedMonthKey] = useState(currentMonthKey);
  const chartDays = useMemo(() => {
    if (chartFilterMode === "range") {
      if (!rangeStartDateKey || !rangeEndDateKey) return [];

      const endDateKey = rangeEndDateKey > yesterdayDateKey ? yesterdayDateKey : rangeEndDateKey;
      return getDateRangeKeys(rangeStartDateKey, endDateKey);
    }

    if (chartFilterMode === "month") {
      if (!selectedMonthKey) return [];

      return getMonthDateRangeKeys(selectedMonthKey, yesterdayDateKey);
    }

    return defaultChartDays;
  }, [chartFilterMode, defaultChartDays, rangeEndDateKey, rangeStartDateKey, selectedMonthKey, yesterdayDateKey]);
  const sevenDays = useMemo(() => defaultChartDays.slice(-7), [defaultChartDays]);
  const chartEndDateKey = chartDays[chartDays.length - 1] ?? yesterdayDateKey;
  const subscriptionStartDateKey = [defaultChartDays[0], monthStart, chartDays[0]].filter(Boolean).sort()[0] ?? defaultChartDays[0];
  const { logs } = useFoodLogsFromDate(subscriptionStartDateKey);
  const { logs: waterLogs } = useWaterLogsFromDate(subscriptionStartDateKey);
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
  const defaultSummaryLogs = logs.filter((log) => log.dateKey >= defaultChartDays[0]);
  const sevenTotals = sumDailyTotals(sevenDayLogs);
  const monthTotals = sumDailyTotals(monthLogs);
  const daysWithLogs = new Set(monthLogs.map((log) => log.dateKey)).size || 1;
  const sevenAverageCalories = Math.round(sevenTotals.calories / 7);
  const sevenAverageProtein = Math.round((sevenTotals.protein / 7) * 10) / 10;
  const monthAverageCalories = Math.round(monthTotals.calories / daysWithLogs);
  const monthAverageProtein = Math.round((monthTotals.protein / daysWithLogs) * 10) / 10;
  const compliance = profile?.dailyCalorieTarget ? Math.round((defaultSummaryLogs.filter((log) => log.calories <= profile.dailyCalorieTarget).length / Math.max(defaultSummaryLogs.length, 1)) * 100) : 0;

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
              Grafikler seçilen filtre aralığındaki verileri gösterir ve bugünü hariç tutar. Grafiklerdeki kesik ortalama çizgileri, bu aralıkta 0 olmayan kalori, protein ve su değerlerinden hesaplanır. Son 7 gün kartları bugünü hariç son 7 günün ortalamasını; ay kartları ise mevcut ayda kayıt bulunan günlerin ortalamasını gösterir.
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
      <Card className="p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold text-ink">Grafik filtresi</p>
            <div className="mt-2 inline-flex rounded-md border border-ink/10 bg-mint p-1">
              <FilterButton active={chartFilterMode === "last30"} onClick={() => setChartFilterMode("last30")}>
                Son 30 gün
              </FilterButton>
              <FilterButton active={chartFilterMode === "range"} onClick={() => setChartFilterMode("range")}>
                Tarih aralığı
              </FilterButton>
              <FilterButton active={chartFilterMode === "month"} onClick={() => setChartFilterMode("month")}>
                Ay seçimi
              </FilterButton>
            </div>
          </div>
          {chartFilterMode === "range" ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[22rem]">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink/80">Başlangıç</span>
                <input
                  type="date"
                  max={yesterdayDateKey}
                  value={rangeStartDateKey}
                  onChange={(event) => setRangeStartDateKey(event.target.value)}
                  className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-leaf focus:ring-2 focus:ring-mint"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink/80">Bitiş</span>
                <input
                  type="date"
                  max={yesterdayDateKey}
                  value={rangeEndDateKey}
                  onChange={(event) => setRangeEndDateKey(event.target.value)}
                  className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-leaf focus:ring-2 focus:ring-mint"
                />
              </label>
            </div>
          ) : null}
          {chartFilterMode === "month" ? (
            <label className="block lg:min-w-48">
              <span className="mb-1 block text-sm font-medium text-ink/80">Ay</span>
              <input
                type="month"
                max={currentMonthKey}
                value={selectedMonthKey}
                onChange={(event) => setSelectedMonthKey(event.target.value)}
                className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-leaf focus:ring-2 focus:ring-mint"
              />
            </label>
          ) : null}
        </div>
      </Card>
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

function FilterButton({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-9 rounded px-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-leaf ${
        active ? "bg-white text-ink shadow-soft" : "text-ink/65 hover:bg-white/70 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function averagePositiveValues(values: Array<number | undefined>, precision = 0) {
  const positiveValues = values.filter((value): value is number => typeof value === "number" && value > 0);
  if (!positiveValues.length) return undefined;

  const average = positiveValues.reduce((total, value) => total + value, 0) / positiveValues.length;
  const multiplier = 10 ** precision;
  return Math.round(average * multiplier) / multiplier;
}
