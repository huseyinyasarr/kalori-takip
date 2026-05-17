import { Pencil, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { FoodForm } from "../components/forms/FoodForm";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { useAuth } from "../features/auth/AuthContext";
import { createFood, deleteFood, updateFood } from "../features/foods/foodService";
import { useFoods } from "../hooks/useFoods";
import type { Food } from "../types";

export function FoodsPage() {
  const { user } = useAuth();
  const { foods, loading, error } = useFoods();
  const [search, setSearch] = useState("");
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const filteredFoods = useMemo(
    () => foods.filter((food) => food.name.toLocaleLowerCase("tr-TR").includes(search.toLocaleLowerCase("tr-TR"))),
    [foods, search],
  );

  if (!user) return null;

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-2xl font-black text-ink">Yemekler</h2>
        <p className="text-sm text-ink/60">100 gram değerleriyle kendi besin veritabanını oluştur.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
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
      </div>
    </div>
  );
}
