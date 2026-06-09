import { Clock, Droplets, Edit2, GlassWater, Plus, Salad, Trash2, Utensils } from "lucide-react";
import { useMemo, useState } from "react";
import { AddFoodLogForm } from "../components/forms/AddFoodLogForm";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { ProgressRing } from "../components/ui/ProgressRing";
import { useAuth } from "../features/auth/AuthContext";
import { createFoodLog, createPlateLog, deleteFoodLog, updateFoodLogGrams } from "../features/logs/logService";
import { submitDailyWeight } from "../features/profile/profileService";
import { useProfile } from "../features/profile/ProfileContext";
import { createWaterLog, deleteWaterLog } from "../features/water/waterService";
import { useFoodLogsByDate } from "../hooks/useFoodLogs";
import { useFoods } from "../hooks/useFoods";
import { usePlates } from "../hooks/usePlates";
import { useWaterGlasses, useWaterLogsByDate } from "../hooks/useWater";
import {
  DEFAULT_PURE_WATER_TARGET_LITER,
  calculateDailyWaterTargetLiter,
  calculateFluidFromFood,
  calculateMacroFromFood,
  convertGlobalPlateToFood,
  sumDailyTotals,
  sumFoodFluidMilliliters,
  sumWaterMilliliters,
} from "../utils/calculations";
import { getFoodCatalogKey, getWaterGlassCatalogKey, isSameFoodReference } from "../utils/catalog";
import { formatTime, getTodayDateKey } from "../utils/date";
import type { Plate, PlateIngredient, FoodLog, WaterGlassSize } from "../types";

const waterGlassIconSize: Record<WaterGlassSize, string> = {
  small: "h-7 w-7",
  medium: "h-9 w-9",
  large: "h-11 w-11",
};

const weightStatusColors = {
  far: { r: 239, g: 125, b: 99 },
  middle: { r: 245, g: 189, b: 79 },
  close: { r: 47, g: 125, b: 91 },
};

function mixWeightColor(from: (typeof weightStatusColors)["far"], to: (typeof weightStatusColors)["far"], amount: number) {
  const ratio = Math.min(Math.max(amount, 0), 1);
  const r = Math.round(from.r + (to.r - from.r) * ratio);
  const g = Math.round(from.g + (to.g - from.g) * ratio);
  const b = Math.round(from.b + (to.b - from.b) * ratio);

  return `rgb(${r}, ${g}, ${b})`;
}

function getCurrentWeightColor(currentWeight: number, targetWeight: number) {
  if (!currentWeight || !targetWeight) return mixWeightColor(weightStatusColors.middle, weightStatusColors.close, 0);

  const distance = Math.abs(currentWeight - targetWeight);
  const farDistance = Math.max(targetWeight * 0.15, 5);
  const closeness = 1 - Math.min(distance / farDistance, 1);

  if (closeness < 0.5) {
    return mixWeightColor(weightStatusColors.far, weightStatusColors.middle, closeness / 0.5);
  }

  return mixWeightColor(weightStatusColors.middle, weightStatusColors.close, (closeness - 0.5) / 0.5);
}

function formatQuickWeightInput(value: string) {
  const normalized = value.replace(",", ".");
  if (!/^\d*\.?\d{0,2}$/.test(normalized)) return null;

  return value;
}

function parseQuickWeight(value: string) {
  const normalized = value.replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;

  return Number(normalized);
}

function buildPlateSnapshot(plate: Plate, ingredients: PlateIngredient[]): Plate {
  const totals = sumDailyTotals(ingredients);
  const totalGrams = Math.round(ingredients.reduce((sum, item) => sum + item.grams, 0) * 10) / 10;
  const fluidMilliliters = ingredients.reduce((sum, item) => sum + (item.fluidMilliliters ?? 0), 0);

  return {
    ...plate,
    name: `${plate.name} (bugünlük)`,
    ingredients,
    totalGrams,
    fluidMilliliters,
    ...totals,
  };
}

export function DashboardPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { foods } = useFoods();
  const { plates } = usePlates();
  const privatePlates = useMemo(() => plates.filter((plate) => plate.source !== "global"), [plates]);
  const foodsWithGlobalPlates = useMemo(
    () => [...foods, ...plates.filter((plate) => plate.source === "global").map(convertGlobalPlateToFood)].sort((a, b) => a.name.localeCompare(b.name, "tr")),
    [foods, plates],
  );
  const todayDateKey = getTodayDateKey();
  const { glasses } = useWaterGlasses();
  const { logs, loading, error } = useFoodLogsByDate(todayDateKey);
  const { logs: waterLogs, loading: waterLoading, error: waterError } = useWaterLogsByDate(todayDateKey);
  const [editingLog, setEditingLog] = useState<FoodLog | null>(null);
  const [addingWaterGlassId, setAddingWaterGlassId] = useState<string | null>(null);
  const [addingPlateId, setAddingPlateId] = useState<string | null>(null);
  const [platePortions, setPlatePortions] = useState<Record<string, string>>({});
  const [customPlateId, setCustomPlateId] = useState<string | null>(null);
  const [customPlateIngredients, setCustomPlateIngredients] = useState<Record<string, PlateIngredient[]>>({});
  const [customFoodId, setCustomFoodId] = useState("");
  const [customFoodGrams, setCustomFoodGrams] = useState("");
  const [grams, setGrams] = useState("");
  const [quickWeight, setQuickWeight] = useState("");
  const totals = sumDailyTotals(logs);
  const pureWaterTotalMl = sumWaterMilliliters(waterLogs);
  const foodFluidTotalMl = sumFoodFluidMilliliters(logs);
  const totalFluidMl = pureWaterTotalMl + foodFluidTotalMl;
  const fluidTargetLiter = calculateDailyWaterTargetLiter(profile?.currentWeight ?? 0);
  const pureWaterTotalLiter = Math.round((pureWaterTotalMl / 1000) * 10) / 10;
  const totalFluidLiter = Math.round((totalFluidMl / 1000) * 10) / 10;
  const currentWeightColor = getCurrentWeightColor(profile?.currentWeight ?? 0, profile?.targetWeight ?? 0);
  const waterCountsByGlass = waterLogs.reduce<Record<string, number>>((acc, log) => {
    const glassKey = `${log.glassSource ?? "private"}:${log.glassId}`;
    acc[glassKey] = (acc[glassKey] ?? 0) + 1;
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
          <Input
            label="Güncel kilo"
            type="text"
            inputMode="decimal"
            value={quickWeight}
            placeholder={`${profile.currentWeight} kg`}
            onChange={(event) => {
              const value = formatQuickWeightInput(event.target.value);
              if (value !== null) setQuickWeight(value);
            }}
          />
          <Button
            variant="secondary"
            icon={<Edit2 className="h-4 w-4" />}
            onClick={async () => {
              const value = parseQuickWeight(quickWeight);
              if (value && value > 0) {
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <ProgressRing label="Saf su" value={pureWaterTotalLiter} target={DEFAULT_PURE_WATER_TARGET_LITER} unit="L" tone="leaf" />
        <ProgressRing label="Toplam sıvı" value={totalFluidLiter} target={fluidTargetLiter} unit="L" tone="ink" />
        <Card className="sm:col-span-1 xl:col-span-3">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-mint text-leaf">
              <Droplets className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-ink">Su Ekle</h3>
              <p className="mt-1 text-sm text-ink/60">
                Saf su hedefi {DEFAULT_PURE_WATER_TARGET_LITER} L, toplam sıvı hedefi kilo / 22 = {fluidTargetLiter} L.
              </p>
              {foodFluidTotalMl ? <p className="mt-1 text-xs text-ink/50">Besinlerden gelen sıvı: {foodFluidTotalMl} ml.</p> : null}
              <div className="mt-4">
                {glasses.length ? (
                  <div className="mobile-list grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {glasses.map((glass) => {
                      const size = glass.size ?? "medium";
                      const glassKey = getWaterGlassCatalogKey(glass);
                      const consumedCount = waterCountsByGlass[glassKey] ?? 0;
                      return (
                        <Button
                          key={glassKey}
                          type="button"
                          variant="secondary"
                          loading={addingWaterGlassId === glassKey}
                          className="relative min-h-24 flex-col px-3 py-3"
                          icon={<GlassWater className={`${waterGlassIconSize[size]} text-leaf`} />}
                          onClick={async () => {
                            setAddingWaterGlassId(glassKey);
                            try {
                              await createWaterLog(user.uid, glass);
                            } finally {
                              setAddingWaterGlassId(null);
                            }
                          }}
                        >
                          {consumedCount ? (
                            <span className="mobile-success absolute right-2 top-2 rounded-full bg-leaf px-2 py-0.5 text-xs font-black text-white">
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
                  <EmptyState title="Henüz bardak eklenmemiş" description="Besinler sayfasından bardak ölçüsü ekleyince buradan su kaydı oluşturabilirsin." />
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="grid gap-5">
          <Card>
            <div className="flex items-center gap-2">
              <Salad className="h-5 w-5 text-leaf" />
              <h3 className="text-lg font-bold text-ink">Besin Ekle</h3>
            </div>
            <div className="mt-4">
              {foodsWithGlobalPlates.length ? (
                <AddFoodLogForm foods={foodsWithGlobalPlates} onAdd={(food, amount) => createFoodLog(user.uid, food, amount)} />
              ) : (
                <EmptyState title="Henüz besin eklenmemiş" description="Besinler sayfasından kayıt ekleyince burada tüketim kaydı oluşturabilirsin." />
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-leaf" />
              <h3 className="text-lg font-bold text-ink">Tabak Ekle</h3>
            </div>
            <div className="mt-4">
              {privatePlates.length ? (
                <div className="mobile-list max-h-72 overflow-y-auto rounded-md border border-ink/10">
                  {privatePlates.map((plate) => {
                    const portionValue = platePortions[plate.id] ?? "1";
                    const portion = Number(portionValue || 1);
                    const isCustomizing = customPlateId === plate.id;
                    const customIngredients = customPlateIngredients[plate.id] ?? plate.ingredients;
                    const customPlate = buildPlateSnapshot(plate, customIngredients);
                    const selectedCustomFood = foodsWithGlobalPlates.find((food) => getFoodCatalogKey(food) === customFoodId);

                    return (
                      <div key={plate.id} className="border-b border-ink/10 p-3 last:border-b-0">
                        <div className="grid gap-3 md:grid-cols-[1fr_96px_auto_auto] md:items-center">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink">{plate.name}</p>
                            <p className="text-xs text-ink/60">
                              {plate.totalGrams} g · {plate.calories} kcal · P {plate.protein} · Y {plate.fat} · K {plate.carbs}
                            </p>
                          </div>
                          <label className="block">
                            <span className="mb-1 block text-xs font-medium text-ink/60 md:sr-only">Porsiyon</span>
                            <input
                              className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-leaf focus:ring-2 focus:ring-mint"
                              type="number"
                              step="0.1"
                              min="0.1"
                              value={portionValue}
                              onChange={(event) => setPlatePortions((current) => ({ ...current, [plate.id]: event.target.value }))}
                              onFocus={(event) => {
                                if (event.currentTarget.value === "1") {
                                  setPlatePortions((current) => ({ ...current, [plate.id]: "" }));
                                }
                              }}
                            />
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            icon={<Edit2 className="h-4 w-4" />}
                            className="px-3"
                            onClick={() => {
                              setCustomPlateId(isCustomizing ? null : plate.id);
                              setCustomPlateIngredients((current) => ({
                                ...current,
                                [plate.id]: current[plate.id] ?? plate.ingredients.map((item) => ({ ...item })),
                              }));
                              setCustomFoodId("");
                              setCustomFoodGrams("");
                            }}
                          >
                            Düzenle
                          </Button>
                          <Button
                            type="button"
                            loading={addingPlateId === plate.id && !isCustomizing}
                            icon={<Plus className="h-4 w-4" />}
                            className="px-3"
                            onClick={async () => {
                              if (portion <= 0) return;
                              setAddingPlateId(plate.id);
                              try {
                                await createPlateLog(user.uid, plate, portion);
                                setPlatePortions((current) => ({ ...current, [plate.id]: "1" }));
                              } finally {
                                setAddingPlateId(null);
                              }
                            }}
                          >
                            Ekle
                          </Button>
                        </div>

                        {isCustomizing ? (
                          <div className="mobile-reveal mt-3 grid gap-3 rounded-md bg-cloud p-3">
                            <div className="mobile-list grid gap-2">
                              {customIngredients.map((item, index) => (
                                <div key={`${item.foodId}-${index}`} className="grid gap-2 md:grid-cols-[1fr_96px_auto] md:items-end">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-ink">{item.foodNameSnapshot}</p>
                                    <p className="text-xs text-ink/55">
                                      {item.calories} kcal · P {item.protein} · Y {item.fat} · K {item.carbs}
                                    </p>
                                  </div>
                                  <label className="block">
                                    <span className="mb-1 block text-xs font-medium text-ink/60 md:sr-only">Gram</span>
                                    <input
                                      className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-leaf focus:ring-2 focus:ring-mint"
                                      type="number"
                                      step="0.1"
                                      min="0.1"
                                      value={item.grams}
                                      onChange={(event) => {
                                        const nextGrams = Number(event.target.value);
                                        setCustomPlateIngredients((current) => ({
                                          ...current,
                                          [plate.id]: customIngredients.map((ingredient, ingredientIndex) => {
                                            if (ingredientIndex !== index) return ingredient;
                                            const sourceFood = foodsWithGlobalPlates.find((food) => isSameFoodReference(food, ingredient.foodId, ingredient.foodSource));
                                            const macros = sourceFood
                                              ? calculateMacroFromFood(sourceFood, nextGrams)
                                              : {
                                                  calories: Math.round((ingredient.calories / ingredient.grams) * nextGrams),
                                                  protein: Math.round((ingredient.protein / ingredient.grams) * nextGrams * 10) / 10,
                                                  fat: Math.round((ingredient.fat / ingredient.grams) * nextGrams * 10) / 10,
                                                  carbs: Math.round((ingredient.carbs / ingredient.grams) * nextGrams * 10) / 10,
                                                };

                                            return {
                                              ...ingredient,
                                              grams: nextGrams,
                                              fluidMilliliters: sourceFood ? calculateFluidFromFood(sourceFood, nextGrams) : Math.round(((ingredient.fluidMilliliters ?? 0) / ingredient.grams) * nextGrams),
                                              ...macros,
                                            };
                                          }),
                                        }));
                                      }}
                                    />
                                  </label>
                                  <Button
                                    type="button"
                                    variant="danger"
                                    className="px-3"
                                    icon={<Trash2 className="h-4 w-4" />}
                                    onClick={() =>
                                      setCustomPlateIngredients((current) => ({
                                        ...current,
                                        [plate.id]: customIngredients.filter((_, ingredientIndex) => ingredientIndex !== index),
                                      }))
                                    }
                                  >
                                    Sil
                                  </Button>
                                </div>
                              ))}
                            </div>

                            <div className="grid gap-2 border-t border-ink/10 pt-3 md:grid-cols-[1fr_96px_auto] md:items-end">
                              <label className="block">
                                <span className="mb-1 block text-xs font-medium text-ink/60">Besin ekle</span>
                                <select
                                  className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-mint"
                                  value={customFoodId}
                                  onChange={(event) => setCustomFoodId(event.target.value)}
                                >
                                  <option value="">Seç</option>
                                  {foodsWithGlobalPlates.map((food) => (
                                    <option key={getFoodCatalogKey(food)} value={getFoodCatalogKey(food)}>
                                      {food.name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <Input label="Gram" type="number" step="0.1" min="0.1" value={customFoodGrams} onChange={(event) => setCustomFoodGrams(event.target.value)} />
                              <Button
                                type="button"
                                variant="secondary"
                                icon={<Plus className="h-4 w-4" />}
                                className="px-3"
                                onClick={() => {
                                  const nextGrams = Number(customFoodGrams);
                                  if (!selectedCustomFood || nextGrams <= 0) return;
                                  setCustomPlateIngredients((current) => ({
                                    ...current,
                                    [plate.id]: [
                                      ...customIngredients,
                                        {
                                          foodId: selectedCustomFood.id,
                                          foodSource: selectedCustomFood.source ?? "private",
                                          foodNameSnapshot: selectedCustomFood.name,
                                          grams: nextGrams,
                                          fluidMilliliters: calculateFluidFromFood(selectedCustomFood, nextGrams),
                                          ...calculateMacroFromFood(selectedCustomFood, nextGrams),
                                        },
                                    ],
                                  }));
                                  setCustomFoodId("");
                                  setCustomFoodGrams("");
                                }}
                              >
                                Ekle
                              </Button>
                            </div>

                            <div className="grid gap-2 text-xs text-ink/60 md:grid-cols-[1fr_auto] md:items-center">
                              <span>
                                Bugünlük toplam: {customPlate.totalGrams} g · {customPlate.calories} kcal · P {customPlate.protein} · Y {customPlate.fat} · K {customPlate.carbs}
                              </span>
                              <div className="flex flex-wrap gap-2 md:justify-end">
                                <Button type="button" variant="ghost" className="px-3" onClick={() => setCustomPlateId(null)}>
                                  Vazgeç
                                </Button>
                                <Button
                                  type="button"
                                  loading={addingPlateId === plate.id && isCustomizing}
                                  className="px-3"
                                  onClick={async () => {
                                    if (portion <= 0 || !customIngredients.length) return;
                                    setAddingPlateId(plate.id);
                                    try {
                                      await createPlateLog(user.uid, customPlate, portion);
                                      setCustomPlateId(null);
                                      setPlatePortions((current) => ({ ...current, [plate.id]: "1" }));
                                    } finally {
                                      setAddingPlateId(null);
                                    }
                                  }}
                                >
                                  Bu Haliyle Ekle
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState title="Henüz kişisel tabak eklenmemiş" description="Tabak sayfasından kendi kombinasyonlarını kaydedince burada hızlıca ekleyebilirsin. Global tabaklar besin aramasından eklenir." />
              )}
            </div>
          </Card>
        </div>
        <Card>
          <h3 className="text-lg font-bold text-ink">Kilo</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="mobile-reveal rounded-md p-3" style={{ backgroundColor: `${currentWeightColor.replace("rgb", "rgba").replace(")", ", 0.14)")}` }}>
              <p className="text-xs font-semibold" style={{ color: currentWeightColor }}>
                Güncel
              </p>
              <p className="mt-1 text-2xl font-black" style={{ color: currentWeightColor }}>
                {profile.currentWeight} kg
              </p>
            </div>
            <div className="mobile-reveal rounded-md bg-mint p-3">
              <p className="text-xs font-semibold text-leaf">Hedef</p>
              <p className="mt-1 text-2xl font-black text-leaf">{profile.targetWeight} kg</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="text-lg font-bold text-ink">Bugün tüketilenler</h3>
        {error ? <p className="mt-3 text-sm font-medium text-coral">{error}</p> : null}
        {loading ? <p className="mt-3 text-sm text-ink/60">Kayıtlar yükleniyor...</p> : null}
        {!loading && !logs.length ? <EmptyState title="Bugün kayıt yok" description="İlk öğününü eklediğinde günlük toplamların otomatik güncellenir." /> : null}
        <div className="mobile-list mt-4 grid gap-2">
          {logs.map((log) => (
            <div key={log.id} className="grid gap-3 rounded-md border border-ink/10 p-3 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="font-semibold text-ink">{log.foodNameSnapshot}</p>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-ink/50">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTime(log.consumedAt)}
                  </span>
                </div>
                {editingLog?.id === log.id ? (
                  <div className="mt-2 flex max-w-xs gap-2">
                    <Input label="Gram" type="number" step="0.1" value={grams} onChange={(event) => setGrams(event.target.value)} />
                    <Button
                      className="self-end"
                      onClick={async () => {
                        await updateFoodLogGrams(user.uid, log, foodsWithGlobalPlates.find((food) => isSameFoodReference(food, log.foodId, log.foodSource)), Number(grams));
                        setEditingLog(null);
                      }}
                    >
                      Kaydet
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-ink/60">
                    {log.grams} g · {log.calories} kcal · P {log.protein} g · Y {log.fat} g · K {log.carbs} g
                    {log.fluidMilliliters ? ` · Sıvı ${log.fluidMilliliters} ml` : ""}
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
        <div className="mobile-list mt-4 grid gap-2">
          {waterLogs.map((log) => (
            <div key={log.id} className="grid gap-3 rounded-md border border-ink/10 p-3 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="font-semibold text-ink">{log.glassNameSnapshot}</p>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-ink/50">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTime(log.consumedAt)}
                  </span>
                </div>
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
