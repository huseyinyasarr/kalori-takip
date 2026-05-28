import { useEffect, useMemo, useState } from "react";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { CaloriesChart, ProteinChart, WaterChart, WeightChart } from "../components/charts/TrackerCharts";
import { subscribeWeightLogsUntilDate } from "../features/history/weightService";
import { useAuth } from "../features/auth/AuthContext";
import { useProfile } from "../features/profile/ProfileContext";
import { useFoodLogsFromDate } from "../hooks/useFoodLogs";
import { useWaterLogsFromDate } from "../hooks/useWater";
import type { WeightLog } from "../types";
import { formatShortDate, getLastNDays, getMonthStartDateKey, getTodayDateKey } from "../utils/date";
import { calculateDailyWaterTargetLiter, calculateTargets, sumDailyTotals, sumWaterMilliliters } from "../utils/calculations";

export function SummaryPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const monthStart = getMonthStartDateKey();
  const sevenDays = getLastNDays(7);
  const { logs } = useFoodLogsFromDate(monthStart);
  const { logs: waterLogs } = useWaterLogsFromDate(monthStart);
  const [weights, setWeights] = useState<WeightLog[]>([]);

  useEffect(() => {
    if (!user) return;
    return subscribeWeightLogsUntilDate(user.uid, getTodayDateKey(), setWeights, () => undefined);
  }, [user]);

  const dailyData = useMemo(() => {
    const keys = getLastNDays(30).filter((key) => key >= monthStart);
    return keys.map((date) => {
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
  }, [logs, monthStart, profile, waterLogs, weights]);

  const sevenDayLogs = logs.filter((log) => sevenDays.includes(log.dateKey));
  const sevenTotals = sumDailyTotals(sevenDayLogs);
  const monthTotals = sumDailyTotals(logs);
  const daysWithLogs = new Set(logs.map((log) => log.dateKey)).size || 1;
  const sevenAverageCalories = Math.round(sevenTotals.calories / 7);
  const sevenAverageProtein = Math.round((sevenTotals.protein / 7) * 10) / 10;
  const monthAverageCalories = Math.round(monthTotals.calories / daysWithLogs);
  const monthAverageProtein = Math.round((monthTotals.protein / daysWithLogs) * 10) / 10;
  const compliance = profile?.dailyCalorieTarget ? Math.round((logs.filter((log) => log.calories <= profile.dailyCalorieTarget).length / Math.max(logs.length, 1)) * 100) : 0;

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-2xl font-black text-ink">Özet</h2>
        <p className="text-sm text-ink/60">Son günler, bu ay ve kilo değişimi.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="7 gün kalori" value={`${sevenAverageCalories} kcal`} />
        <Metric label="7 gün protein" value={`${sevenAverageProtein} g`} />
        <Metric label="Ay kalori" value={`${monthAverageCalories} kcal`} />
        <Metric label="Ay protein" value={`${monthAverageProtein} g`} />
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
