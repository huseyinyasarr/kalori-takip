import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { Download, Info } from "lucide-react";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/Button";
import { CaloriesChart, ProteinChart, PureWaterChart, WaterChart, WeightChart } from "../components/charts/TrackerCharts";
import { subscribeWeightLogsUntilDate } from "../features/history/weightService";
import { useAuth } from "../features/auth/AuthContext";
import { useProfile } from "../features/profile/ProfileContext";
import { useFoodLogsFromDate } from "../hooks/useFoodLogs";
import { useWaterLogsFromDate } from "../hooks/useWater";
import type { WeightLog } from "../types";
import {
  addDays,
  formatDateKey,
  formatShortDate,
  getDateRangeKeys,
  getLastNCompletedDays,
  getMonthDateRangeKeys,
  getTodayDateKey,
} from "../utils/date";
import {
  DEFAULT_PURE_WATER_TARGET_LITER,
  calculateDailyWaterTargetLiter,
  calculateTargets,
  sumDailyTotals,
  sumFoodFluidMilliliters,
  sumWaterMilliliters,
} from "../utils/calculations";

type ChartFilterMode = "last7" | "last30" | "range" | "month";

const PDF_EXPORT_CONTENT_WIDTH = 1152;
const PDF_EXPORT_VIEWPORT_WIDTH = 1440;

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
  const weightChartDays = useMemo(() => {
    if (chartFilterMode === "range") {
      if (!rangeStartDateKey || !rangeEndDateKey) return [];

      const endDateKey = rangeEndDateKey > todayDateKey ? todayDateKey : rangeEndDateKey;
      return getDateRangeKeys(rangeStartDateKey, endDateKey);
    }

    if (chartFilterMode === "month") {
      if (!selectedMonthKey) return [];

      return getMonthDateRangeKeys(selectedMonthKey, todayDateKey);
    }

    if (chartFilterMode === "last7") {
      return getDateRangeKeys(addDays(todayDateKey, -6), todayDateKey);
    }

    return getDateRangeKeys(addDays(todayDateKey, -29), todayDateKey);
  }, [chartFilterMode, rangeEndDateKey, rangeStartDateKey, selectedMonthKey, todayDateKey]);
  const weightChartEndDateKey = weightChartDays[weightChartDays.length - 1] ?? todayDateKey;
  const chartFilterLabel = useMemo(
    () => formatChartFilterLabel(chartFilterMode, chartDays, selectedMonthKey),
    [chartDays, chartFilterMode, selectedMonthKey],
  );
  const { logs } = useFoodLogsFromDate("0000-01-01");
  const { logs: waterLogs } = useWaterLogsFromDate("0000-01-01");
  const [weights, setWeights] = useState<WeightLog[]>([]);

  useEffect(() => {
    if (!user) return;
    return subscribeWeightLogsUntilDate(user.uid, weightChartEndDateKey, setWeights, () => undefined);
  }, [user, weightChartEndDateKey]);

  const dailyData = useMemo(() => {
    const baseData = chartDays.map((date) => {
      const totals = sumDailyTotals(logs.filter((log) => log.dateKey === date));
      const weight = weights.find((item) => item.dateKey === date && item.weight !== null)?.weight ?? null;
      const effectiveWeight = weights.find((item) => item.dateKey <= date && item.weight !== null)?.weight ?? profile?.currentWeight ?? 0;
      const targets = profile ? calculateTargets(effectiveWeight, profile.targetWeight) : null;
      const dayLogs = logs.filter((log) => log.dateKey === date);
      const dayWaterLogs = waterLogs.filter((log) => log.dateKey === date);
      const pureWaterLiter = Math.round((sumWaterMilliliters(dayWaterLogs) / 1000) * 10) / 10;
      const waterLiter = Math.round((pureWaterLiter + sumFoodFluidMilliliters(dayLogs) / 1000) * 10) / 10;
      return {
        date,
        label: formatShortDate(date),
        ...totals,
        calorieTarget: targets?.dailyCalorieTarget,
        proteinTarget: targets?.proteinTargetGram,
        weight,
        waterLiter,
        pureWaterLiter,
        pureWaterTargetLiter: DEFAULT_PURE_WATER_TARGET_LITER,
        waterTargetLiter: calculateDailyWaterTargetLiter(effectiveWeight),
      };
    });

    const calorieAverage = averagePositiveValues(baseData.map((item) => item.calories));
    const proteinAverage = averagePositiveValues(baseData.map((item) => item.protein), 1);
    const waterAverageLiter = averagePositiveValues(baseData.map((item) => item.waterLiter), 1);
    const pureWaterAverageLiter = averagePositiveValues(baseData.map((item) => item.pureWaterLiter), 1);

    return baseData.map((item) => ({
      ...item,
      calorieAverage,
      proteinAverage,
      waterAverageLiter,
      pureWaterAverageLiter,
    }));
  }, [chartDays, logs, profile, waterLogs, weights]);

  const weightData = useMemo(() => {
    return weightChartDays.map((date) => ({
      date,
      label: formatShortDate(date),
      weight: weights.find((item) => item.dateKey === date && item.weight !== null)?.weight ?? null,
    }));
  }, [weightChartDays, weights]);

  const overallDailyData = useMemo(() => {
    const dateKeys = Array.from(new Set([...logs.map((log) => log.dateKey), ...waterLogs.map((log) => log.dateKey)]))
      .filter((dateKey) => dateKey < todayDateKey)
      .sort();

    return dateKeys.map((date) => {
      const dayLogs = logs.filter((log) => log.dateKey === date);
      const totals = sumDailyTotals(dayLogs);
      const pureWaterLiter = Math.round((sumWaterMilliliters(waterLogs.filter((log) => log.dateKey === date)) / 1000) * 10) / 10;
      const waterLiter = Math.round((pureWaterLiter + sumFoodFluidMilliliters(dayLogs) / 1000) * 10) / 10;
      return {
        ...totals,
        waterLiter,
        pureWaterLiter,
      };
    });
  }, [logs, todayDateKey, waterLogs]);
  const overallAverageCalories = averagePositiveValues(overallDailyData.map((item) => item.calories));
  const overallAverageProtein = averagePositiveValues(overallDailyData.map((item) => item.protein), 1);
  const overallAverageWaterLiter = averagePositiveValues(overallDailyData.map((item) => item.waterLiter), 1);
  const overallAveragePureWaterLiter = averagePositiveValues(overallDailyData.map((item) => item.pureWaterLiter), 1);
  const overallTrackedDays = overallDailyData.length;
  const calorieCompliance = calculateGoalCompliance(
    dailyData.map((item) => ({ value: item.calories, target: item.calorieTarget })),
    (value, target) => value <= target,
  );
  const proteinCompliance = calculateGoalCompletion(dailyData.map((item) => ({ value: item.protein, target: item.proteinTarget })));
  const waterCompliance = calculateGoalCompletion(dailyData.map((item) => ({ value: item.waterLiter, target: item.waterTargetLiter })));
  const pureWaterCompliance = calculateGoalCompletion(dailyData.map((item) => ({ value: item.pureWaterLiter, target: item.pureWaterTargetLiter })));

  async function exportSummaryPdf() {
    if (!exportRef.current || isExporting) return;

    const exportedAt = new Date();
    setIsExporting(true);
    setExportError(null);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      await document.fonts.ready;
      await wait(1500);

      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: "#f6fbf7",
        scale: 2,
        windowWidth: PDF_EXPORT_VIEWPORT_WIDTH,
        useCORS: true,
        ignoreElements: (element) => element.classList.contains("pdf-ignore"),
        onclone: (documentClone) => {
          const exportRoot = documentClone.querySelector<HTMLElement>("[data-pdf-export-root]");
          if (!exportRoot) return;

          exportRoot.style.width = `${PDF_EXPORT_CONTENT_WIDTH}px`;
          exportRoot.style.maxWidth = "none";
        },
      });
      const image = canvas.toDataURL("image/png", 1);
      const pageMargin = Math.min(Math.max(Math.round(Math.min(canvas.width, canvas.height) * 0.04), 48), 96);
      const exportMetadataImage = await createExportMetadataImage({ user, exportedAt });
      const metadataHeight = 112;
      const pageWidth = canvas.width + pageMargin * 2;
      const pageHeight = canvas.height + pageMargin * 2 + metadataHeight;
      const pdf = new jsPDF({
        orientation: pageWidth > pageHeight ? "landscape" : "portrait",
        unit: "px",
        format: [pageWidth, pageHeight],
        compress: true,
      });

      pdf.addImage(
        exportMetadataImage.dataUrl,
        "PNG",
        pageWidth - pageMargin - exportMetadataImage.width,
        pageMargin,
        exportMetadataImage.width,
        exportMetadataImage.height,
      );
      pdf.addImage(image, "PNG", pageMargin, pageMargin + metadataHeight, canvas.width, canvas.height);
      pdf.save(`kalori-ozet-${todayDateKey}.pdf`);
    } catch {
      setExportError("PDF oluşturulamadı. Sayfayı yenileyip tekrar deneyebilirsin.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div
      ref={exportRef}
      data-pdf-export-root
      className="grid gap-5"
    >
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
                  Üst kartlar bugünü hariç tüm kayıtlı geçmişin genel ortalamasını gösterir ve 0 olan değerleri ortalamaya katmaz. Grafikler seçilen filtre aralığındaki verileri gösterir ve bugünü hariç tutar. Kesik ortalama çizgileri 0 olmayan değerlerden hesaplanır. Kalori hedef uyumu, 0 olmayan günlerde hedefi aşmayan günlerin oranıdır. Protein, su ve toplam sıvı hedef uyumu, 0 olmayan günlerde toplam tüketimin toplam hedefe oranıdır; örneğin iki günde 100 g hedefe karşı 80 g ve 70 g protein alınırsa uyum %75 olur.
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
            {isExporting ? "PDF hazırlanıyor" : "PDF"}
          </Button>
        </div>
        {exportError ? <p className="pdf-ignore mt-2 text-sm font-medium text-coral">{exportError}</p> : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Genel kalori ort." value={formatMetricValue(overallAverageCalories, "kcal")} />
        <Metric label="Genel protein ort." value={formatMetricValue(overallAverageProtein, "g")} />
        <Metric label="Genel su ort." value={formatMetricValue(overallAveragePureWaterLiter, "L")} />
        <Metric label="Genel sıvı ort." value={formatMetricValue(overallAverageWaterLiter, "L")} />
        <Metric label="Kayıtlı gün" value={`${overallTrackedDays}`} />
      </div>
      <Card className="p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold text-ink">Grafik filtresi</p>
            {isExporting ? (
              <div className="mt-2 rounded-md border border-leaf/20 bg-mint px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-ink/55">Seçili aralık</p>
                <p className="mt-0.5 text-sm font-black text-ink">{chartFilterLabel}</p>
              </div>
            ) : (
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
            )}
          </div>
          {!isExporting && chartFilterMode === "range" ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[22rem]">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink/80">Başlangıç</span>
                <input
                  type="date"
                  max={todayDateKey}
                  value={rangeStartDateKey}
                  onChange={(event) => setRangeStartDateKey(event.target.value)}
                  className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-leaf focus:ring-2 focus:ring-mint"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink/80">Bitiş</span>
                <input
                  type="date"
                  max={todayDateKey}
                  value={rangeEndDateKey}
                  onChange={(event) => setRangeEndDateKey(event.target.value)}
                  className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-leaf focus:ring-2 focus:ring-mint"
                />
              </label>
            </div>
          ) : null}
          {!isExporting && chartFilterMode === "month" ? (
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
        <EmptyState title="Özet için veri yok" description="Besin, su veya kilo kaydı eklendiğinde grafikler burada oluşur." />
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
          <ChartTitle title="Toplam sıvı tüketimi" compliance={waterCompliance} />
          <WaterChart data={dailyData} />
        </Card>
        <Card className="xl:col-span-2">
          <ChartTitle title="Su tüketimi" compliance={pureWaterCompliance} />
          <PureWaterChart data={dailyData} />
        </Card>
        <Card className="xl:col-span-2">
          <h3 className="mb-4 text-lg font-bold text-ink">Kilo değişimi</h3>
          <WeightChart data={weightData} />
        </Card>
      </div>
    </div>
  );
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function formatChartFilterLabel(mode: ChartFilterMode, chartDays: string[], selectedMonthKey: string) {
  const dateRangeLabel = formatDateRange(chartDays);

  if (mode === "last7") {
    return dateRangeLabel ? `Son hafta: ${dateRangeLabel}` : "Son hafta";
  }

  if (mode === "range") {
    return dateRangeLabel ? `Tarih aralığı: ${dateRangeLabel}` : "Tarih aralığı";
  }

  if (mode === "month") {
    const monthLabel = formatMonthKey(selectedMonthKey);
    return dateRangeLabel ? `Ay seçimi: ${monthLabel} (${dateRangeLabel})` : `Ay seçimi: ${monthLabel}`;
  }

  return dateRangeLabel ? `Son 30 gün: ${dateRangeLabel}` : "Son 30 gün";
}

function formatDateRange(dateKeys: string[]) {
  const startDateKey = dateKeys[0];
  const endDateKey = dateKeys[dateKeys.length - 1];
  if (!startDateKey || !endDateKey) return "";

  if (startDateKey === endDateKey) {
    return formatDateKey(startDateKey);
  }

  return `${formatDateKey(startDateKey)} - ${formatDateKey(endDateKey)}`;
}

function formatMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;

  return new Intl.DateTimeFormat("tr-TR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

async function createExportMetadataImage({ user, exportedAt }: { user: User | null; exportedAt: Date }) {
  const displayName = getUserDisplayName(user);
  const email = user?.email ?? "-";
  const initials = getUserInitials(displayName, email);
  const width = 360;
  const height = 88;
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext("2d");
  if (!ctx) return { dataUrl: "", width, height };

  ctx.scale(scale, scale);
  ctx.clearRect(0, 0, width, height);
  ctx.shadowColor = "rgba(23, 32, 28, 0.08)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 8;
  drawRoundedRect(ctx, 0.5, 0.5, width - 1, height - 1, 8, "#ffffff", "rgba(23, 32, 28, 0.1)");
  ctx.shadowColor = "transparent";

  const avatarSize = 50;
  const avatarX = width - 18 - avatarSize;
  const avatarY = (height - avatarSize) / 2;
  const textRight = avatarX - 16;
  const textLeft = 18;
  const textWidth = textRight - textLeft;

  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(23, 32, 28, 0.52)";
  ctx.font = "700 10px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillText("PDF OLUŞTURMA", textRight, 14);

  ctx.fillStyle = "#17201c";
  ctx.font = "800 13px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  drawFittedText(ctx, formatExportDateTime(exportedAt), textRight, 32, textWidth);

  ctx.font = "800 14px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  drawFittedText(ctx, displayName, textRight, 51, textWidth);

  ctx.fillStyle = "rgba(23, 32, 28, 0.58)";
  ctx.font = "600 11px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  drawFittedText(ctx, email, textRight, 69, textWidth);

  await drawAvatar(ctx, user?.photoURL, initials, avatarX, avatarY, avatarSize);

  return { dataUrl: canvas.toDataURL("image/png"), width, height };
}

function getUserDisplayName(user: User | null) {
  return user?.displayName || user?.email?.split("@")[0] || "Kullanıcı";
}

function getUserInitials(displayName: string, email: string) {
  const source = displayName === "Kullanıcı" && email !== "-" ? email.split("@")[0] : displayName;
  const initials = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("tr-TR");

  return initials || "K";
}

function formatExportDateTime(date: Date | null) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: string,
  strokeStyle?: string,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();

  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawFittedText(ctx: CanvasRenderingContext2D, text: string, right: number, y: number, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, right, y);
    return;
  }

  let fittedText = text;
  while (fittedText.length > 1 && ctx.measureText(`${fittedText}...`).width > maxWidth) {
    fittedText = fittedText.slice(0, -1);
  }
  ctx.fillText(`${fittedText}...`, right, y);
}

async function drawAvatar(
  ctx: CanvasRenderingContext2D,
  photoURL: string | null | undefined,
  initials: string,
  x: number,
  y: number,
  size: number,
) {
  const image = photoURL ? await loadImage(photoURL).catch(() => null) : null;

  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (image) {
    ctx.drawImage(image, x, y, size, size);
  } else {
    ctx.fillStyle = "#d8f4e2";
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = "#008765";
    ctx.font = "800 18px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, x + size / 2, y + size / 2);
  }

  ctx.restore();
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.referrerPolicy = "no-referrer";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image could not be loaded."));
    image.src = src;
  });
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
