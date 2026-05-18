import { Droplets, GlassWater, Pencil, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { FoodForm } from "../components/forms/FoodForm";
import { WaterGlassForm } from "../components/forms/WaterGlassForm";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { useAuth } from "../features/auth/AuthContext";
import { createFood, deleteFood, updateFood } from "../features/foods/foodService";
import { createWaterGlass, deleteWaterGlass, updateWaterGlass } from "../features/water/waterService";
import { useFoods } from "../hooks/useFoods";
import { useWaterGlasses } from "../hooks/useWater";
import type { Food, WaterGlass, WaterGlassSize } from "../types";

const waterGlassLabels: Record<WaterGlassSize, string> = {
  small: "Küçük",
  medium: "Orta",
  large: "Büyük",
};

const waterGlassIconSize: Record<WaterGlassSize, string> = {
  small: "h-5 w-5",
  medium: "h-6 w-6",
  large: "h-7 w-7",
};

export function FoodsPage() {
  const { user } = useAuth();
  const { foods, loading, error } = useFoods();
  const { glasses, loading: glassesLoading, error: glassesError } = useWaterGlasses();
  const [search, setSearch] = useState("");
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [editingGlass, setEditingGlass] = useState<WaterGlass | null>(null);
  const filteredFoods = useMemo(
    () => foods.filter((food) => food.name.toLocaleLowerCase("tr-TR").includes(search.toLocaleLowerCase("tr-TR"))),
    [foods, search],
  );

  if (!user) return null;

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-2xl font-black text-ink">Yemekler</h2>
        <p className="text-sm text-ink/60">100 gram değerleriyle besinlerini ve günlük su için bardaklarını oluştur.</p>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-lg font-bold text-ink">{editingFood ? "Yemeği düzenle" : "Yeni yemek"}</h3>
          <FoodForm
            editingFood={editingFood}
            onCancel={() => setEditingFood(null)}
            onSubmit={async (payload) => {
              if (editingFood) {
                await updateFood(user.uid, editingFood.id, payload);
                setEditingFood(null);
              } else {
                await createFood(user.uid, payload);
              }
            }}
          />
        </Card>
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Droplets className="h-5 w-5 text-leaf" />
            <h3 className="text-lg font-bold text-ink">{editingGlass ? "Bardağı düzenle" : "Yeni bardak"}</h3>
          </div>
          <WaterGlassForm
            editingGlass={editingGlass}
            onCancel={() => setEditingGlass(null)}
            onSubmit={async (payload) => {
              if (editingGlass) {
                await updateWaterGlass(user.uid, editingGlass.id, payload);
                setEditingGlass(null);
              } else {
                await createWaterGlass(user.uid, payload);
              }
            }}
          />
        </Card>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <Input label="Ara" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Yulaf, tavuk..." />
            <Button variant="secondary" icon={<Search className="h-4 w-4" />}>
              Ara
            </Button>
          </div>
          {error ? <p className="text-sm font-medium text-coral">{error}</p> : null}
          {loading ? <p className="text-sm text-ink/60">Yemekler yükleniyor...</p> : null}
          {!loading && !filteredFoods.length ? <EmptyState title="Yemek bulunamadı" description="Arama filtresini değiştir veya ilk besinini ekle." /> : null}
          <div className="grid gap-2">
            {filteredFoods.map((food) => (
              <div key={food.id} className="grid gap-3 rounded-md border border-ink/10 p-3 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="font-semibold text-ink">{food.name}</p>
                  <p className="text-sm text-ink/60">
                    {food.caloriesPer100g} kcal · P {food.proteinPer100g} g · Y {food.fatPer100g} g · K {food.carbPer100g} g
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditingFood(food)}>
                    Düzenle
                  </Button>
                  <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => deleteFood(user.uid, food.id)}>
                    Sil
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="mb-4 text-lg font-bold text-ink">Bardaklar</h3>
          {glassesError ? <p className="text-sm font-medium text-coral">{glassesError}</p> : null}
          {glassesLoading ? <p className="text-sm text-ink/60">Bardaklar yükleniyor...</p> : null}
          {!glassesLoading && !glasses.length ? <EmptyState title="Bardak bulunamadı" description="Su takibi için kullandığın bardak veya şişe ölçüsünü ekle." /> : null}
          <div className="grid gap-2">
            {glasses.map((glass) => (
              <div key={glass.id} className="grid gap-3 rounded-md border border-ink/10 p-3 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <GlassWater className={`${waterGlassIconSize[glass.size ?? "medium"]} text-leaf`} />
                    <p className="font-semibold text-ink">{glass.name}</p>
                  </div>
                  <p className="text-sm text-ink/60">
                    {glass.milliliters} ml · {waterGlassLabels[glass.size ?? "medium"]}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditingGlass(glass)}>
                    Düzenle
                  </Button>
                  <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => deleteWaterGlass(user.uid, glass.id)}>
                    Sil
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
