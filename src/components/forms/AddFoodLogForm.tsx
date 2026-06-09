import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Food, FoodPortion } from "../../types";
import { calculateFluidFromFood, calculateMacroFromFood, getFoodNutritionUnit } from "../../utils/calculations";
import { getFoodCatalogKey } from "../../utils/catalog";
import { Button } from "../ui/Button";

const schema = z.object({
  foodKey: z.string().min(1, "Besin seçmelisin."),
  portionKey: z.string().min(1, "Ölçü seçmelisin."),
  amount: z.coerce.number().positive("Miktar pozitif sayı olmalı."),
});

interface AddFoodLogFormProps {
  foods: Food[];
  onAdd: (food: Food, grams: number) => Promise<void>;
}

const customPortionKey = "custom-grams";
type FoodSourceFilter = "all" | "private" | "global";

export function AddFoodLogForm({ foods, onAdd }: AddFoodLogFormProps) {
  const [foodSearch, setFoodSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<FoodSourceFilter>("all");
  const [isFoodPickerOpen, setIsFoodPickerOpen] = useState(false);
  const [detailFood, setDetailFood] = useState<Food | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<{ foodKey: string; portionKey: string; amount: number }>({
    resolver: zodResolver(schema),
    defaultValues: { foodKey: "", portionKey: customPortionKey, amount: 100 },
  });
  const selectedFoodKey = watch("foodKey");
  const selectedPortionKey = watch("portionKey");
  const amount = Number(watch("amount") || 0);
  const selectedFood = useMemo(() => foods.find((item) => getFoodCatalogKey(item) === selectedFoodKey), [foods, selectedFoodKey]);
  const selectedNutritionUnit = selectedFood ? getFoodNutritionUnit(selectedFood) : "g";
  const portions = useMemo(() => normalizeSelectableFoodPortions(selectedFood?.portions), [selectedFood]);
  const grams = useMemo(() => {
    if (!selectedFood) return 0;
    if (selectedPortionKey === customPortionKey) return amount;

    const portion = portions.find((item) => getPortionKey(item.name, item.grams) === selectedPortionKey);
    return portion ? Math.round(portion.grams * amount * 10) / 10 : 0;
  }, [amount, portions, selectedFood, selectedPortionKey]);
  const preview = selectedFood && grams > 0 ? calculateMacroFromFood(selectedFood, grams) : null;
  const fluidMilliliters = selectedFood && grams > 0 ? calculateFluidFromFood(selectedFood, grams) : 0;
  const amountField = register("amount");
  const filteredFoods = useMemo(() => {
    const normalizedSearch = foodSearch.trim().toLocaleLowerCase("tr-TR");

    return foods.filter((food) => {
      const sourceMatches = sourceFilter === "all" || (food.source ?? "private") === sourceFilter;
      const searchMatches = !normalizedSearch || food.name.toLocaleLowerCase("tr-TR").includes(normalizedSearch);
      return sourceMatches && searchMatches;
    });
  }, [foods, foodSearch, sourceFilter]);

  return (
    <form
      className="grid gap-3"
      onSubmit={handleSubmit(async ({ foodKey }) => {
        const food = foods.find((item) => getFoodCatalogKey(item) === foodKey);
        if (!food || grams <= 0) return;
        await onAdd(food, grams);
        reset({ foodKey: "", portionKey: customPortionKey, amount: 100 });
        setFoodSearch("");
      })}
    >
      <div className="grid gap-3">
        <div className="relative block">
          <span className="mb-1 block text-sm font-medium text-ink/80">Besin / içecek</span>
          <input type="hidden" {...register("foodKey")} />
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
            <input
              className="w-full rounded-md border border-ink/15 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-leaf focus:ring-2 focus:ring-mint"
              placeholder="Besin ara veya seç"
              value={foodSearch}
              onBlur={() => window.setTimeout(() => setIsFoodPickerOpen(false), 120)}
              onChange={(event) => {
                setFoodSearch(event.target.value);
                setIsFoodPickerOpen(true);
                if (selectedFoodKey) {
                  setValue("foodKey", "");
                  setValue("portionKey", customPortionKey);
                }
              }}
              onFocus={() => setIsFoodPickerOpen(true)}
            />
          </div>
          {isFoodPickerOpen ? (
            <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-ink/10 bg-white py-1 text-sm shadow-lg">
              {filteredFoods.length ? (
                filteredFoods.map((food) => {
                  const foodKey = getFoodCatalogKey(food);
                  const isGlobalPlate = food.entryType === "plate" && food.source === "global";
                  return (
                    <div
                      key={foodKey}
                      className={`grid grid-cols-[1fr_auto] items-center gap-2 transition hover:bg-mint/60 ${foodKey === selectedFoodKey ? "bg-mint/80 text-ink" : "text-ink/80"}`}
                    >
                      <button
                        type="button"
                        className="grid w-full gap-1 px-3 py-2 text-left"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setFoodSearch(food.name);
                          setValue("foodKey", foodKey, { shouldDirty: true, shouldValidate: true });
                          setValue("portionKey", customPortionKey, { shouldDirty: true });
                          setValue("amount", 100, { shouldDirty: true });
                          setIsFoodPickerOpen(false);
                        }}
                      >
                        <span className="break-words font-semibold leading-snug">{food.name}</span>
                        <span className="text-xs text-ink/45">
                          {isGlobalPlate ? "Global tabak" : food.source === "global" ? "Global katalog" : "Benim eklediklerim"}
                        </span>
                      </button>
                      {isGlobalPlate ? (
                        <button
                          type="button"
                          className="mr-2 grid h-8 w-8 place-items-center rounded-full text-ink/55 transition hover:bg-white hover:text-leaf"
                          aria-label={`${food.name} detaylarını göster`}
                          title="Tabak detayları"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={(event) => {
                            event.stopPropagation();
                            setDetailFood(food);
                            setIsFoodPickerOpen(false);
                          }}
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <span className="block px-3 py-2 text-ink/50">Besin bulunamadı</span>
              )}
            </div>
          ) : null}
          {errors.foodKey ? <span className="mt-1 block text-xs font-medium text-coral">{errors.foodKey.message}</span> : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(150px,0.8fr)_minmax(280px,1.4fr)_auto] sm:items-start">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink/80">Kaynak</span>
            <select
              className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-mint"
              value={sourceFilter}
              onChange={(event) => {
                setSourceFilter(event.target.value as FoodSourceFilter);
                setIsFoodPickerOpen(true);
                if (selectedFoodKey) {
                  setValue("foodKey", "");
                  setValue("portionKey", customPortionKey);
                  setFoodSearch("");
                }
              }}
            >
              <option value="all">Tümü</option>
              <option value="private">Benim eklediklerim</option>
              <option value="global">Global katalog</option>
            </select>
          </label>

          <div>
            <span className="mb-1 block text-sm font-medium text-ink/80">Miktar / ölçü</span>
            <div className="grid grid-cols-[112px_minmax(0,1fr)]">
              <input
                className="w-full rounded-l-md border border-r-0 border-ink/15 bg-white px-3 py-2 text-sm font-semibold outline-none transition focus:z-10 focus:border-leaf focus:ring-2 focus:ring-mint"
                type="number"
                step="0.1"
                {...amountField}
                onFocus={(event) => {
                  if (event.currentTarget.value === "100" || event.currentTarget.value === "1") {
                    event.currentTarget.value = "";
                  }
                }}
              />
              <select
                className="w-full rounded-r-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none transition focus:z-10 focus:border-leaf focus:ring-2 focus:ring-mint disabled:bg-cloud disabled:text-ink/55"
                {...register("portionKey")}
                disabled={!selectedFood}
              >
                <option value={customPortionKey}>{selectedNutritionUnit === "ml" ? "Mililitre" : "Gram"}</option>
                {portions.map((portion) => (
                  <option key={getPortionKey(portion.name, portion.grams)} value={getPortionKey(portion.name, portion.grams)}>
                    {portion.name} ({portion.grams} {selectedNutritionUnit})
                  </option>
                ))}
              </select>
            </div>
            {errors.amount ? <span className="mt-1 block text-xs font-medium text-coral">{errors.amount.message}</span> : null}
            {errors.portionKey ? <span className="mt-1 block text-xs font-medium text-coral">{errors.portionKey.message}</span> : null}
          </div>
          <Button className="w-full sm:mt-6" loading={isSubmitting} icon={<Plus className="h-4 w-4" />} disabled={!selectedFood || grams <= 0}>
            Ekle
          </Button>
        </div>
      </div>

      {selectedFood && preview ? (
        <div className="rounded-md bg-mint p-3 text-sm text-ink">
          <p className="font-bold">{selectedFood.name}</p>
          <p className="mt-1 text-ink/65">
            {grams} {selectedNutritionUnit} · {preview.calories} kcal · P {preview.protein} g · Y {preview.fat} g · K {preview.carbs} g
            {fluidMilliliters ? ` · Sıvı ${fluidMilliliters} ml` : ""}
          </p>
          {selectedFood.description ? <p className="mt-2 text-xs text-ink/55">{selectedFood.description}</p> : null}
        </div>
      ) : null}
      {detailFood ? <GlobalPlateDetailModal food={detailFood} onClose={() => setDetailFood(null)} /> : null}
    </form>
  );
}

function GlobalPlateDetailModal({ food, onClose }: { food: Food; onClose: () => void }) {
  const ingredients = food.plateIngredients ?? [];
  const totalGrams = food.plateTotalGrams ?? food.portions?.[0]?.grams ?? 0;
  const totalFluid = food.plateFluidMilliliters ?? calculateFluidFromFood(food, totalGrams);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-leaf">Global tabak detayı</p>
            <h3 className="text-xl font-black text-ink">{food.name}</h3>
            <p className="mt-1 text-sm text-ink/60">
              {totalGrams} g · {Math.round(food.caloriesPer100g * totalGrams / 100)} kcal
              {totalFluid ? ` · Sıvı ${totalFluid} ml` : ""}
            </p>
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-ink/50 transition hover:bg-cloud hover:text-ink"
            aria-label="Pencereyi kapat"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {ingredients.length ? (
          <div className="grid gap-2">
            {ingredients.map((ingredient, index) => (
              <div key={`${ingredient.foodId}-${index}`} className="rounded-md border border-ink/10 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-ink">{ingredient.foodNameSnapshot}</p>
                  <span className="rounded-full bg-cloud px-2 py-0.5 text-xs font-bold text-ink/60">{ingredient.grams} g</span>
                </div>
                <p className="mt-1 text-sm text-ink/60">
                  {ingredient.calories} kcal · P {ingredient.protein} g · Y {ingredient.fat} g · K {ingredient.carbs} g
                  {ingredient.fluidMilliliters ? ` · Sıvı ${ingredient.fluidMilliliters} ml` : ""}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-md bg-cloud p-3 text-sm text-ink/60">Bu tabak için içerik detayı bulunamadı.</p>
        )}
      </div>
    </div>
  );
}

function getPortionKey(name: string, grams: number) {
  return `${name}-${grams}`;
}

function normalizeSelectableFoodPortions(portions: FoodPortion[] | undefined) {
  return (portions ?? [])
    .map((portion) => ({
      id: portion.id || portion.name.toLocaleLowerCase("tr-TR").replace(/\s+/g, "-"),
      name: portion.name.trim(),
      grams: Number(portion.grams),
    }))
    .filter((portion) => portion.name && portion.grams > 0);
}
