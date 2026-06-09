import { CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { publishPrivateCatalog, type PublishPrivateCatalogResult } from "../features/admin/catalogPublishService";
import { useAuth } from "../features/auth/AuthContext";
import { approveGlobalFood, rejectGlobalFood } from "../features/foods/foodService";
import { approveGlobalPlate, rejectGlobalPlate } from "../features/plates/plateService";
import { usePendingGlobalFoods } from "../hooks/useFoods";
import { usePendingGlobalPlates } from "../hooks/usePlates";
import type { Food, Plate } from "../types";
import { getFoodNutritionUnit } from "../utils/calculations";

type ModerationAction = "approve" | "reject";

export function AdminPage() {
  const { user } = useAuth();
  const { foods, loading: foodsLoading, error: foodsError } = usePendingGlobalFoods();
  const { plates, loading: platesLoading, error: platesError } = usePendingGlobalPlates();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<PublishPrivateCatalogResult | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

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

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-2xl font-black text-ink">Admin</h2>
        <p className="text-sm text-ink/60">Editörlerden gelen global besin ve tabak önerilerini yönet.</p>
      </div>

      <Card>
        <h3 className="text-lg font-bold text-ink">Mevcut kayıtlarımı global yap</h3>
        <p className="mt-1 text-sm text-ink/60">
          Kendi hesabındaki eski özel besin, tabak ve bardak kayıtlarını herkesin görebileceği global kataloğa kopyalar. Aynı kayıtlar tekrar çalıştırıldığında güncellenir.
        </p>
        {publishError ? <p className="mt-3 text-sm font-medium text-coral">{publishError}</p> : null}
        {publishResult ? (
          <p className="mt-3 rounded-md bg-mint p-3 text-sm font-semibold text-ink">
            Yayınlandı: {publishResult.foods} besin, {publishResult.plates} tabak, {publishResult.waterGlasses} bardak.
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
        <div className="grid gap-2">
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
        <div className="grid gap-2">
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
