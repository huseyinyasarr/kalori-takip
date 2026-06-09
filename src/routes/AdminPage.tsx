import { CheckCircle2, RotateCcw, UploadCloud, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import {
  publishPrivateCatalog,
  publishSelectedPrivateFoods,
  type PublishPrivateCatalogResult,
  type PublishSelectedPrivateFoodsResult,
} from "../features/admin/catalogPublishService";
import { useAuth } from "../features/auth/AuthContext";
import { approveGlobalFood, rejectGlobalFood } from "../features/foods/foodService";
import { approveGlobalPlate, rejectGlobalPlate } from "../features/plates/plateService";
import { useAllGlobalFoods, useFoods, usePendingGlobalFoods } from "../hooks/useFoods";
import { usePendingGlobalPlates } from "../hooks/usePlates";
import type { Food, Plate } from "../types";
import { getFoodNutritionUnit } from "../utils/calculations";
import { formatDateKey } from "../utils/date";

type ModerationAction = "approve" | "reject";

export function AdminPage() {
  const { user } = useAuth();
  const { foods: visibleFoods, loading: visibleFoodsLoading, error: visibleFoodsError } = useFoods();
  const { foods: allGlobalFoods, loading: allGlobalFoodsLoading, error: allGlobalFoodsError } = useAllGlobalFoods();
  const { foods, loading: foodsLoading, error: foodsError } = usePendingGlobalFoods();
  const { plates, loading: platesLoading, error: platesError } = usePendingGlobalPlates();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<PublishPrivateCatalogResult | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [selectedPrivateFoodIds, setSelectedPrivateFoodIds] = useState<string[]>([]);
  const [privateFoodSearch, setPrivateFoodSearch] = useState("");
  const [privateFoodStartDate, setPrivateFoodStartDate] = useState("");
  const [privateFoodEndDate, setPrivateFoodEndDate] = useState("");
  const [selectedFoodPublishResult, setSelectedFoodPublishResult] = useState<PublishSelectedPrivateFoodsResult | null>(null);
  const [selectedFoodPublishError, setSelectedFoodPublishError] = useState<string | null>(null);

  const globalFoodNameSet = useMemo(() => new Set(allGlobalFoods.map((food) => normalizeCatalogName(food.name))), [allGlobalFoods]);
  const myPrivateFoods = useMemo(() => visibleFoods.filter((food) => food.source !== "global"), [visibleFoods]);
  const filteredPrivateFoods = useMemo(() => {
    const normalizedSearch = normalizeCatalogName(privateFoodSearch);

    return myPrivateFoods.filter((food) => {
      const createdDateKey = getTimestampDateKey(food.createdAt);
      const matchesSearch = !normalizedSearch || normalizeCatalogName(food.name).includes(normalizedSearch);
      const matchesStart = !privateFoodStartDate || (createdDateKey ? createdDateKey >= privateFoodStartDate : false);
      const matchesEnd = !privateFoodEndDate || (createdDateKey ? createdDateKey <= privateFoodEndDate : false);

      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [myPrivateFoods, privateFoodEndDate, privateFoodSearch, privateFoodStartDate]);
  const publishableFilteredPrivateFoodIds = useMemo(
    () => filteredPrivateFoods.filter((food) => !globalFoodNameSet.has(normalizeCatalogName(food.name))).map((food) => food.id),
    [filteredPrivateFoods, globalFoodNameSet],
  );
  const selectedPublishableFoodCount = selectedPrivateFoodIds.filter((foodId) => publishableFilteredPrivateFoodIds.includes(foodId)).length;
  const privateFoodListLoading = visibleFoodsLoading || allGlobalFoodsLoading;
  const privateFoodListError = visibleFoodsError || allGlobalFoodsError;

  async function moderateFood(food: Food, action: ModerationAction) {
    setBusyKey(`food-${food.id}-${action}`);
    try {
      if (action === "approve") {
        await approveGlobalFood(food.id);
      } else {
        await rejectGlobalFood(food.id);
      }
    } finally {
      setBusyKey(null);
    }
  }

  async function moderatePlate(plate: Plate, action: ModerationAction) {
    setBusyKey(`plate-${plate.id}-${action}`);
    try {
      if (action === "approve") {
        await approveGlobalPlate(plate.id);
      } else {
        await rejectGlobalPlate(plate.id);
      }
    } finally {
      setBusyKey(null);
    }
  }

  async function publishMyPrivateCatalog() {
    if (!user) return;

    setBusyKey("publish-private-catalog");
    setPublishError(null);
    setPublishResult(null);
    try {
      setPublishResult(await publishPrivateCatalog(user.uid));
    } catch {
      setPublishError("Mevcut kayıtlar global kataloğa yayınlanamadı. Rules yayınını ve bağlantını kontrol et.");
    } finally {
      setBusyKey(null);
    }
  }

  async function publishSelectedFoods() {
    if (!user) return;

    const selectedIds = selectedPrivateFoodIds.filter((foodId) => publishableFilteredPrivateFoodIds.includes(foodId));
    if (!selectedIds.length) return;

    setBusyKey("publish-selected-foods");
    setSelectedFoodPublishError(null);
    setSelectedFoodPublishResult(null);
    try {
      const result = await publishSelectedPrivateFoods(user.uid, selectedIds);
      setSelectedFoodPublishResult(result);
      setSelectedPrivateFoodIds((current) => current.filter((foodId) => !selectedIds.includes(foodId)));
    } catch {
      setSelectedFoodPublishError("Seçili besinler global kataloğa aktarılamadı. Rules yayınını ve bağlantını kontrol et.");
    } finally {
      setBusyKey(null);
    }
  }

  function togglePrivateFoodSelection(foodId: string) {
    setSelectedPrivateFoodIds((current) => (current.includes(foodId) ? current.filter((item) => item !== foodId) : [...current, foodId]));
  }

  function toggleAllFilteredPrivateFoods() {
    const allSelected = publishableFilteredPrivateFoodIds.every((foodId) => selectedPrivateFoodIds.includes(foodId));
    if (allSelected) {
      setSelectedPrivateFoodIds((current) => current.filter((foodId) => !publishableFilteredPrivateFoodIds.includes(foodId)));
      return;
    }

    setSelectedPrivateFoodIds((current) => Array.from(new Set([...current, ...publishableFilteredPrivateFoodIds])));
  }

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-2xl font-black text-ink">Admin</h2>
        <p className="text-sm text-ink/60">Editörlerden gelen global besin ve tabak önerilerini yönet.</p>
      </div>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <UploadCloud className="h-5 w-5 text-leaf" />
          <h3 className="text-lg font-bold text-ink">Özel besinleri globale aktar</h3>
        </div>
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_160px_160px_auto] md:items-end">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink/80">Besin adı</span>
            <input
              value={privateFoodSearch}
              onChange={(event) => setPrivateFoodSearch(event.target.value)}
              placeholder="Yulaf, tavuk..."
              className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-leaf focus:ring-2 focus:ring-mint"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink/80">Başlangıç</span>
            <input
              type="date"
              value={privateFoodStartDate}
              onChange={(event) => setPrivateFoodStartDate(event.target.value)}
              className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-leaf focus:ring-2 focus:ring-mint"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink/80">Bitiş</span>
            <input
              type="date"
              value={privateFoodEndDate}
              onChange={(event) => setPrivateFoodEndDate(event.target.value)}
              className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-leaf focus:ring-2 focus:ring-mint"
            />
          </label>
          <Button
            type="button"
            variant="secondary"
            icon={<RotateCcw className="h-4 w-4" />}
            onClick={() => {
              setPrivateFoodSearch("");
              setPrivateFoodStartDate("");
              setPrivateFoodEndDate("");
            }}
          >
            Temizle
          </Button>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={!publishableFilteredPrivateFoodIds.length} onClick={toggleAllFilteredPrivateFoods}>
            {publishableFilteredPrivateFoodIds.length && publishableFilteredPrivateFoodIds.every((foodId) => selectedPrivateFoodIds.includes(foodId))
              ? "Görünen Seçimi Kaldır"
              : "Aktarılabilirleri Seç"}
          </Button>
          <Button
            type="button"
            icon={<UploadCloud className="h-4 w-4" />}
            loading={busyKey === "publish-selected-foods"}
            disabled={!selectedPublishableFoodCount}
            onClick={publishSelectedFoods}
          >
            Seçilenleri Aktar ({selectedPublishableFoodCount})
          </Button>
        </div>
        {privateFoodListError ? <p className="text-sm font-medium text-coral">{privateFoodListError}</p> : null}
        {privateFoodListLoading ? <p className="text-sm text-ink/60">Özel besinler yükleniyor...</p> : null}
        {!privateFoodListLoading && !filteredPrivateFoods.length ? (
          <EmptyState title="Aktarılacak besin bulunamadı" description="Filtreleri değiştir veya önce özel besin ekle." />
        ) : null}
        {selectedFoodPublishError ? <p className="mb-3 text-sm font-medium text-coral">{selectedFoodPublishError}</p> : null}
        {selectedFoodPublishResult ? (
          <p className="mobile-success mb-3 rounded-md bg-mint p-3 text-sm font-semibold text-ink">
            Aktarıldı: {selectedFoodPublishResult.published} besin.
            {selectedFoodPublishResult.skippedDuplicates.length
              ? ` Aynı isim nedeniyle eklenmeyenler: ${selectedFoodPublishResult.skippedDuplicates.join(", ")}.`
              : ""}
          </p>
        ) : null}
        <div className="mobile-list grid gap-2">
          {filteredPrivateFoods.map((food) => {
            const isDuplicate = globalFoodNameSet.has(normalizeCatalogName(food.name));
            const isSelected = selectedPrivateFoodIds.includes(food.id);
            return (
              <PrivateFoodPublishRow
                key={food.id}
                food={food}
                isDuplicate={isDuplicate}
                isSelected={isSelected}
                onToggle={() => togglePrivateFoodSelection(food.id)}
              />
            );
          })}
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold text-ink">Mevcut kayıtlarımı topluca global yap</h3>
        <p className="mt-1 text-sm text-ink/60">
          Kendi hesabındaki eski özel besin, tabak ve bardak kayıtlarını herkesin görebileceği global kataloğa kopyalar. Globalde aynı isimde besin varsa o besin eklenmez.
        </p>
        {publishError ? <p className="mt-3 text-sm font-medium text-coral">{publishError}</p> : null}
        {publishResult ? (
          <p className="mobile-success mt-3 rounded-md bg-mint p-3 text-sm font-semibold text-ink">
            Yayınlandı: {publishResult.foods} besin, {publishResult.plates} tabak, {publishResult.waterGlasses} bardak.
            {publishResult.skippedDuplicateFoods.length
              ? ` Aynı isim nedeniyle eklenmeyen besinler: ${publishResult.skippedDuplicateFoods.join(", ")}.`
              : ""}
          </p>
        ) : null}
        <Button
          className="mt-4"
          variant="secondary"
          loading={busyKey === "publish-private-catalog"}
          onClick={publishMyPrivateCatalog}
        >
          Eski Kayıtları Global Kataloğa Yayınla
        </Button>
      </Card>

      <Card>
        <h3 className="mb-4 text-lg font-bold text-ink">Onay bekleyen besinler</h3>
        {foodsError ? <p className="text-sm font-medium text-coral">{foodsError}</p> : null}
        {foodsLoading ? <p className="text-sm text-ink/60">Besinler yükleniyor...</p> : null}
        {!foodsLoading && !foods.length ? <EmptyState title="Bekleyen besin yok" description="Yeni öneriler geldiğinde burada görünür." /> : null}
        <div className="mobile-list grid gap-2">
          {foods.map((food) => (
            <PendingFoodCard key={food.id} food={food} busyKey={busyKey} onModerate={moderateFood} />
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 text-lg font-bold text-ink">Onay bekleyen tabaklar</h3>
        {platesError ? <p className="text-sm font-medium text-coral">{platesError}</p> : null}
        {platesLoading ? <p className="text-sm text-ink/60">Tabaklar yükleniyor...</p> : null}
        {!platesLoading && !plates.length ? <EmptyState title="Bekleyen tabak yok" description="Yeni öneriler geldiğinde burada görünür." /> : null}
        <div className="mobile-list grid gap-2">
          {plates.map((plate) => (
            <div key={plate.id} className="grid gap-3 rounded-md border border-ink/10 p-3 md:grid-cols-[1fr_auto] md:items-start">
              <div>
                <p className="font-semibold text-ink">{plate.name}</p>
                <p className="text-sm text-ink/60">
                  {plate.totalGrams} g · {plate.calories} kcal · P {plate.protein} g · Y {plate.fat} g · K {plate.carbs} g
                  {plate.fluidMilliliters ? ` · Sıvı ${plate.fluidMilliliters} ml` : ""}
                </p>
                <p className="mt-2 text-xs text-ink/50">{plate.ingredients.map((item) => `${item.foodNameSnapshot} ${item.grams} g`).join(" + ")}</p>
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <Button
                  variant="secondary"
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  loading={busyKey === `plate-${plate.id}-approve`}
                  onClick={() => moderatePlate(plate, "approve")}
                >
                  Onayla
                </Button>
                <Button
                  variant="danger"
                  icon={<XCircle className="h-4 w-4" />}
                  loading={busyKey === `plate-${plate.id}-reject`}
                  onClick={() => moderatePlate(plate, "reject")}
                >
                  Reddet
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function PrivateFoodPublishRow({
  food,
  isDuplicate,
  isSelected,
  onToggle,
}: {
  food: Food;
  isDuplicate: boolean;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const nutritionUnit = getFoodNutritionUnit(food);
  const createdDateKey = getTimestampDateKey(food.createdAt);

  return (
    <div className="grid gap-3 rounded-md border border-ink/10 p-3 md:grid-cols-[auto_1fr] md:items-start">
      <label className="flex items-center md:pt-1">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-ink/20 text-leaf focus:ring-leaf disabled:opacity-40"
          checked={isSelected}
          disabled={isDuplicate}
          onChange={onToggle}
          aria-label={`${food.name} seç`}
        />
      </label>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-ink">{food.name}</p>
          {isDuplicate ? (
            <span className="rounded-full bg-coral/10 px-2 py-0.5 text-xs font-bold text-coral">Globalde aynı isim var</span>
          ) : (
            <span className="rounded-full bg-mint px-2 py-0.5 text-xs font-bold text-leaf">Aktarılabilir</span>
          )}
          {createdDateKey ? <span className="rounded-full bg-cloud px-2 py-0.5 text-xs font-bold text-ink/55">{formatDateKey(createdDateKey)}</span> : null}
        </div>
        <p className="mt-1 text-sm text-ink/60">
          100 {nutritionUnit}: {food.caloriesPer100g} kcal · P {food.proteinPer100g} g · Y {food.fatPer100g} g · K {food.carbPer100g} g
          {food.fluidRatio ? ` · Sıvı %${Math.round(food.fluidRatio * 100)}` : ""}
        </p>
        {food.description ? <p className="mt-1 text-xs text-ink/50">{food.description}</p> : null}
      </div>
    </div>
  );
}

function PendingFoodCard({
  food,
  busyKey,
  onModerate,
}: {
  food: Food;
  busyKey: string | null;
  onModerate: (food: Food, action: ModerationAction) => void;
}) {
  const nutritionUnit = getFoodNutritionUnit(food);

  return (
    <div className="grid gap-3 rounded-md border border-ink/10 p-3 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <p className="font-semibold text-ink">{food.name}</p>
        <p className="text-sm text-ink/60">
          100 {nutritionUnit}: {food.caloriesPer100g} kcal · P {food.proteinPer100g} g · Y {food.fatPer100g} g · K {food.carbPer100g} g
          {food.fluidRatio ? ` · Sıvı %${Math.round(food.fluidRatio * 100)}` : ""}
        </p>
        {food.description ? <p className="mt-1 text-xs text-ink/50">{food.description}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">
        <Button
          variant="secondary"
          icon={<CheckCircle2 className="h-4 w-4" />}
          loading={busyKey === `food-${food.id}-approve`}
          onClick={() => onModerate(food, "approve")}
        >
          Onayla
        </Button>
        <Button
          variant="danger"
          icon={<XCircle className="h-4 w-4" />}
          loading={busyKey === `food-${food.id}-reject`}
          onClick={() => onModerate(food, "reject")}
        >
          Reddet
        </Button>
      </div>
    </div>
  );
}

function normalizeCatalogName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
}

function getTimestampDateKey(timestamp: Food["createdAt"]) {
  if (!timestamp) return "";

  return formatDateKeyParts(timestamp.toDate());
}

function formatDateKeyParts(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}
