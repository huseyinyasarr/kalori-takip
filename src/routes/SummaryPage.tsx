import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Info } from "lucide-react";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/Button";
import { CaloriesChart, ProteinChart, WaterChart, WeightChart } from "../components/charts/TrackerCharts";
import { subscribeWeightLogsUntilDate } from "../features/history/weightService";
import { useAuth } from "../features/auth/AuthContext";
import { useProfile } from "../features/profile/ProfileContext";
import { useFoodLogsFromDate } from "../hooks/useFoodLogs";
import { useWaterLogsFromDate } from "../hooks/useWater";
import type { WeightLog } from "../types";
import { addDays, formatShortDate, getDateRangeKeys, getLastNCompletedDays, getMonthDateRangeKeys, getTodayDateKey } from "../utils/date";
import { calculateDailyWaterTargetLiter, calculateTargets, sumDailyTotals, sumWaterMilliliters } from "../utils/calculations";

type ChartFilterMode = "last7" | "last30" | "range" | "month";

export function SummaryPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const todayDateKey = getTodayDateKey();
  const yesterdayDateKey = addDays(todayDateKey, -1);
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

    if (chartFilterMode === "last7") {
      return getLastNCompletedDays(7, todayDateKey);
    }

    return defaultChartDays;
  }, [chartFilterMode, defaultChartDays, rangeEndDateKey, rangeStartDateKey, selectedMonthKey, todayDateKey, yesterdayDateKey]);
  const chartEndDateKey = chartDays[chartDays.length - 1] ?? yesterdayDateKey;
  const { logs } = useFoodLogsFromDate("0000-01-01");
  const { logs: waterLogs } = useWaterLogsFromDate("0000-01-01");
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

  const overallDailyData = useMemo(() => {
    const dateKeys = Array.from(new Set([...logs.map((log) => log.dateKey), ...waterLogs.map((log) => log.dateKey)]))
      .filter((dateKey) => dateKey < todayDateKey)
      .sort();

    return dateKeys.map((date) => {
      const totals = sumDailyTotals(logs.filter((log) => log.dateKey === date));
      const waterLiter = Math.round((sumWaterMilliliters(waterLogs.filter((log) => log.dateKey === date)) / 1000) * 10) / 10;
      return {
        ...totals,
        waterLiter,
      };
    });
  }, [logs, todayDateKey, waterLogs]);
  const overallAverageCalories = averagePositiveValues(overallDailyData.map((item) => item.calories));
  const overallAverageProtein = averagePositiveValues(overallDailyData.map((item) => item.protein), 1);
  const overallAverageWaterLiter = averagePositiveValues(overallDailyData.map((item) => item.waterLiter), 1);
  const overallTrackedDays = overallDailyData.length;
  const calorieCompliance = calculateGoalCompliance(
    dailyData.map((item) => ({ value: item.calories, target: item.calorieTarget })),
    (value, target) => value <= target,
  );
  const proteinCompliance = calculateGoalCompletion(dailyData.map((item) => ({ value: item.protein, target: item.proteinTarget })));
  const waterCompliance = calculateGoalCompletion(dailyData.map((item) => ({ value: item.waterLiter, target: item.waterTargetLiter })));

  async function exportSummaryPdf() {
    if (!exportRef.current || isExporting) return;

    setIsExporting(true);
    setExportError(null);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      await document.fonts.ready;

      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: "#f6fbf7",
        scale: 2,
        useCORS: true,
        ignoreElements: (element) => element.classList.contains("pdf-ignore"),
      });
      const image = canvas.toDataURL("image/png", 1);
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
        compress: true,
      });

      pdf.addImage(image, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`kalori-ozet-${todayDateKey}.pdf`);
    } catch {
      setExportError("PDF oluşturulamadı. Sayfayı yenileyip tekrar deneyebilirsin.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div ref={exportRef} className="grid gap-5">
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                  Üst kartlar bugünü hariç tüm kayıtlı geçmişin genel ortalamasını gösterir ve 0 olan değerleri ortalamaya katmaz. Grafikler seçilen filtre aralığındaki verileri gösterir ve bugünü hariç tutar. Kesik ortalama çizgileri 0 olmayan değerlerden hesaplanır. Kalori hedef uyumu, 0 olmayan günlerde hedefi aşmayan günlerin oranıdır. Protein ve su hedef uyumu, 0 olmayan günlerde toplam tüketimin toplam hedefe oranıdır; örneğin iki günde 100 g hedefe karşı 80 g ve 70 g protein alınırsa uyum %75 olur.
                </div>
              </div>
            </div>
            <p className="text-sm text-ink/60">Son günler, bu ay ve kilo değişimi.</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            icon={<Download className="h-4 w-4" />}
            loading={isExporting}
            onClick={exportSummaryPdf}
            className="pdf-ignore w-full sm:w-auto"
          >
            PDF
          </Button>
        </div>
        {exportError ? <p className="pdf-ignore mt-2 text-sm font-medium text-coral">{exportError}</p> : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Genel kalori ort." value={formatMetricValue(overallAverageCalories, "kcal")} />
        <Metric label="Genel protein ort." value={formatMetricValue(overallAverageProtein, "g")} />
        <Metric label="Genel su ort." value={formatMetricValue(overallAverageWaterLiter, "L")} />
        <Metric label="Kayıtlı gün" value={`${overallTrackedDays}`} />
      </div>
      <Card className="p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold text-ink">Grafik filtresi</p>
            <div className="mt-2 inline-flex flex-wrap rounded-md border border-ink/10 bg-mint p-1">
              <FilterButton active={chartFilterMode === "last7"} onClick={() => setChartFilterMode("last7")}>
                Son hafta
              </FilterButton>
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
          <ChartTitle title="Kalori tüketimi" compliance={calorieCompliance} />
          <CaloriesChart data={dailyData} />
        </Card>
        <Card>
          <ChartTitle title="Protein tüketimi" compliance={proteinCompliance} />
          <ProteinChart data={dailyData} />
        </Card>
        <Card className="xl:col-span-2">
          <ChartTitle title="Su tüketimi" compliance={waterCompliance} />
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

function formatMetricValue(value: number | undefined, unit: string) {
  return typeof value === "number" ? `${value} ${unit}` : "-";
}

function ChartTitle({ title, compliance }: { title: string; compliance?: number }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      <div className="shrink-0 rounded-md bg-mint px-2.5 py-1 text-right">
        <p className="text-[10px] font-bold uppercase tracking-wide text-ink/55">Hedef uyumu</p>
        <p className="text-sm font-black text-ink">{typeof compliance === "number" ? `${compliance}%` : "-"}</p>
      </div>
    </div>
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

function calculateGoalCompliance(
  values: Array<{ value?: number; target?: number }>,
  isCompliant: (value: number, target: number) => boolean,
) {
  const trackedValues = values.filter(
    (item): item is { value: number; target: number } =>
      typeof item.value === "number" && item.value > 0 && typeof item.target === "number" && item.target > 0,
  );
  if (!trackedValues.length) return undefined;

  const compliantCount = trackedValues.filter((item) => isCompliant(item.value, item.target)).length;
  return Math.round((compliantCount / trackedValues.length) * 100);
}

function calculateGoalCompletion(values: Array<{ value?: number; target?: number }>) {
  const trackedValues = values.filter(
    (item): item is { value: number; target: number } =>
      typeof item.value === "number" && item.value > 0 && typeof item.target === "number" && item.target > 0,
  );
  if (!trackedValues.length) return undefined;

  const totalValue = trackedValues.reduce((total, item) => total + item.value, 0);
  const totalTarget = trackedValues.reduce((total, item) => total + item.target, 0);
  return Math.min(Math.round((totalValue / totalTarget) * 100), 100);
}
