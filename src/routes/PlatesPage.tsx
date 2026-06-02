import { Pencil, Plus, Search, Trash2, Utensils } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { useAuth } from "../features/auth/AuthContext";
import { createPlate, deletePlate, updatePlate } from "../features/plates/plateService";
import { useFoods } from "../hooks/useFoods";
import { usePlates } from "../hooks/usePlates";
import type { Plate, PlateIngredient } from "../types";
import { calculateMacroFromFood, sumDailyTotals } from "../utils/calculations";

export function PlatesPage() {
  const { user } = useAuth();
  const { foods } = useFoods();
  const { plates, loading, error } = usePlates();
  const [plateName, setPlateName] = useState("");
  const [foodId, setFoodId] = useState("");
  const [foodSearch, setFoodSearch] = useState("");
  const [isFoodPickerOpen, setIsFoodPickerOpen] = useState(false);
  const [grams, setGrams] = useState("");
  const [ingredients, setIngredients] = useState<PlateIngredient[]>([]);
  const [editingPlate, setEditingPlate] = useState<Plate | null>(null);
  const totals = useMemo(() => sumDailyTotals(ingredients), [ingredients]);
  const totalGrams = useMemo(() => Math.round(ingredients.reduce((sum, item) => sum + item.grams, 0) * 10) / 10, [ingredients]);
  const filteredFoods = useMemo(() => {
    const normalizedSearch = foodSearch.trim().toLocaleLowerCase("tr-TR");

    if (!normalizedSearch) {
      return foods;
    }

    return foods.filter((food) => food.name.toLocaleLowerCase("tr-TR").includes(normalizedSearch));
  }, [foods, foodSearch]);

  if (!user) return null;

  const selectedFood = foods.find((food) => food.id === foodId);

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-2xl font-black text-ink">Tabak</h2>
        <p className="text-sm text-ink/60">Sık yediğin kombinasyonları tek porsiyon olarak hazırla.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Utensils className="h-5 w-5 text-leaf" />
            <h3 className="text-lg font-bold text-ink">{editingPlate ? "Tabağı düzenle" : "Yeni tabak"}</h3>
          </div>

          <form
            className="grid gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!plateName.trim() || !ingredients.length) return;

              const payload = {
                name: plateName.trim(),
                ingredients,
                totalGrams,
                calories: totals.calories,
                protein: totals.protein,
                fat: totals.fat,
                carbs: totals.carbs,
              };

              if (editingPlate) {
                await updatePlate(user.uid, editingPlate.id, payload);
              } else {
                await createPlate(user.uid, payload);
              }

              setEditingPlate(null);
              setPlateName("");
              setFoodId("");
              setFoodSearch("");
              setGrams("");
              setIngredients([]);
            }}
          >
            <Input label="Tabak adı" value={plateName} onChange={(event) => setPlateName(event.target.value)} placeholder="Pilav + tavuk" />

            <div className="grid gap-3 md:grid-cols-[1fr_120px_auto] md:items-end">
              <label className="relative block">
                <span className="mb-1 block text-sm font-medium text-ink/80">Yemek</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
                  <input
                    className="w-full rounded-md border border-ink/15 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-leaf focus:ring-2 focus:ring-mint"
                    placeholder="Yemek ara veya seç"
                    value={foodSearch}
                    onBlur={() => window.setTimeout(() => setIsFoodPickerOpen(false), 120)}
                    onChange={(event) => {
                      setFoodSearch(event.target.value);
                      setIsFoodPickerOpen(true);
                      if (foodId) {
                        setFoodId("");
                      }
                    }}
                    onFocus={() => setIsFoodPickerOpen(true)}
                  />
                </div>
                {isFoodPickerOpen ? (
                  <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-ink/10 bg-white py-1 text-sm shadow-lg">
                    {filteredFoods.length ? (
                      filteredFoods.map((food) => (
                        <button
                          key={food.id}
                          type="button"
                          className={`block w-full px-3 py-2 text-left transition hover:bg-mint/60 ${food.id === foodId ? "bg-mint/80 font-semibold text-ink" : "text-ink/80"}`}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setFoodSearch(food.name);
                            setFoodId(food.id);
                            setIsFoodPickerOpen(false);
                          }}
                        >
                          {food.name}
                        </button>
                      ))
                    ) : (
                      <span className="block px-3 py-2 text-ink/50">Yemek bulunamadı</span>
                    )}
                  </div>
                ) : null}
              </label>
              <Input
                label="Gram"
                type="number"
                step="0.1"
                value={grams}
                onChange={(event) => setGrams(event.target.value)}
                onFocus={(event) => {
                  if (event.currentTarget.value === "0") {
                    setGrams("");
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  const amount = Number(grams);
                  if (!selectedFood || amount <= 0) return;
                  const macros = calculateMacroFromFood(selectedFood, amount);
                  setIngredients((current) => [
                    ...current,
                    {
                      foodId: selectedFood.id,
                      foodNameSnapshot: selectedFood.name,
                      grams: amount,
                      ...macros,
                    },
                  ]);
                  setFoodId("");
                  setFoodSearch("");
                  setGrams("");
                }}
              >
                Ekle
              </Button>
            </div>

            {!foods.length ? <EmptyState title="Yemek yok" description="Tabak hazırlamak için önce Yemekler sayfasından besin ekle." /> : null}

            <div className="grid gap-2">
              {ingredients.map((item, index) => (
                <div key={`${item.foodId}-${index}`} className="grid gap-3 rounded-md border border-ink/10 p-3 md:grid-cols-[1fr_120px_auto] md:items-end">
                  <div>
                    <p className="font-semibold text-ink">{item.foodNameSnapshot}</p>
                    <p className="text-sm text-ink/60">
                      {item.grams} g · {item.calories} kcal · P {item.protein} g · Y {item.fat} g · K {item.carbs} g
                    </p>
                  </div>
                  <Input
                    label="Gram"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={item.grams}
                    onChange={(event) => {
                      const amount = Number(event.target.value);
                      setIngredients((current) =>
                        current.map((ingredient, itemIndex) => {
                          if (itemIndex !== index) return ingredient;
                          const sourceFood = foods.find((food) => food.id === ingredient.foodId);
                          const macros = sourceFood
                            ? calculateMacroFromFood(sourceFood, amount)
                            : {
                                calories: Math.round((ingredient.calories / ingredient.grams) * amount),
                                protein: Math.round((ingredient.protein / ingredient.grams) * amount * 10) / 10,
                                fat: Math.round((ingredient.fat / ingredient.grams) * amount * 10) / 10,
                                carbs: Math.round((ingredient.carbs / ingredient.grams) * amount * 10) / 10,
                              };

                          return { ...ingredient, grams: amount, ...macros };
                        }),
                      );
                    }}
                  />
                  <Button type="button" variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setIngredients((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                    Sil
                  </Button>
                </div>
              ))}
            </div>

            <div className="grid gap-2 rounded-md bg-mint p-3 text-sm text-ink sm:grid-cols-2">
              <p>
                <span className="font-semibold text-leaf">Toplam:</span> {totalGrams} g
              </p>
              <p>
                {totals.calories} kcal · P {totals.protein} g · Y {totals.fat} g · K {totals.carbs} g
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button disabled={!plateName.trim() || !ingredients.length}>{editingPlate ? "Güncelle" : "Tabağı kaydet"}</Button>
              {editingPlate ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditingPlate(null);
                    setPlateName("");
                    setFoodId("");
                    setFoodSearch("");
                    setGrams("");
                    setIngredients([]);
                  }}
                >
                  Vazgeç
                </Button>
              ) : null}
            </div>
          </form>
        </Card>

        <Card>
          <h3 className="mb-4 text-lg font-bold text-ink">Kayıtlı tabaklar</h3>
          {loading ? <p className="text-sm text-ink/60">Tabaklar yükleniyor...</p> : null}
          {!loading && !plates.length ? (
            <EmptyState title="Tabak yok" description={error ? "Kayıtlı tabak bulunamadı. İlk tabağını kaydettiğinde burada listelenir." : "Sık yediğin öğünleri kaydettiğinde burada listelenir."} />
          ) : null}
          <div className="grid gap-2">
            {plates.map((plate) => (
              <div key={plate.id} className="grid gap-3 rounded-md border border-ink/10 p-3 md:grid-cols-[1fr_auto] md:items-start">
                <div>
                  <p className="font-semibold text-ink">{plate.name}</p>
                  <p className="text-sm text-ink/60">
                    {plate.totalGrams} g · {plate.calories} kcal · P {plate.protein} g · Y {plate.fat} g · K {plate.carbs} g
                  </p>
                  <p className="mt-2 text-xs text-ink/50">
                    {plate.ingredients.map((item) => `${item.foodNameSnapshot} ${item.grams} g`).join(" + ")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    icon={<Pencil className="h-4 w-4" />}
                    onClick={() => {
                      setEditingPlate(plate);
                      setPlateName(plate.name);
                      setIngredients(plate.ingredients.map((item) => ({ ...item })));
                      setFoodId("");
                      setFoodSearch("");
                      setGrams("");
                    }}
                  >
                    Düzenle
                  </Button>
                  <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => deletePlate(user.uid, plate.id)}>
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
