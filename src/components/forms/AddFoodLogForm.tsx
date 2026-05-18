import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Food } from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

const schema = z.object({
  foodId: z.string().min(1, "Yemek seçmelisin."),
  grams: z.coerce.number().positive("Gram pozitif sayı olmalı."),
});

interface AddFoodLogFormProps {
  foods: Food[];
  onAdd: (food: Food, grams: number) => Promise<void>;
}

export function AddFoodLogForm({ foods, onAdd }: AddFoodLogFormProps) {
  const [foodSearch, setFoodSearch] = useState("");
  const [isFoodPickerOpen, setIsFoodPickerOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<{ foodId: string; grams: number }>({
    resolver: zodResolver(schema),
    defaultValues: { foodId: "", grams: 100 },
  });
  const selectedFoodId = watch("foodId");
  const gramsField = register("grams");
  const filteredFoods = useMemo(() => {
    const normalizedSearch = foodSearch.trim().toLocaleLowerCase("tr-TR");

    if (!normalizedSearch) {
      return foods;
    }

    return foods.filter((food) => food.name.toLocaleLowerCase("tr-TR").includes(normalizedSearch));
  }, [foods, foodSearch]);

  return (
    <form
      className="grid gap-3 md:grid-cols-[1fr_160px_auto] md:items-end"
      onSubmit={handleSubmit(async ({ foodId, grams }) => {
        const food = foods.find((item) => item.id === foodId);
        if (!food) return;
        await onAdd(food, grams);
        reset({ foodId: "", grams: 100 });
        setFoodSearch("");
      })}
    >
      <div className="relative block">
        <span className="mb-1 block text-sm font-medium text-ink/80">Yemek</span>
        <input type="hidden" {...register("foodId")} />
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
              if (selectedFoodId) {
                setValue("foodId", "");
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
                  className={`block w-full px-3 py-2 text-left transition hover:bg-mint/60 ${food.id === selectedFoodId ? "bg-mint/80 font-semibold text-ink" : "text-ink/80"}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setFoodSearch(food.name);
                    setValue("foodId", food.id, { shouldDirty: true, shouldValidate: true });
                    setValue("grams", 100, { shouldDirty: true });
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
        {errors.foodId ? <span className="mt-1 block text-xs font-medium text-coral">{errors.foodId.message}</span> : null}
      </div>
      <Input
        label="Gram"
        type="number"
        step="0.1"
        error={errors.grams?.message}
        {...gramsField}
        onFocus={(event) => {
          if (event.currentTarget.value === "100") {
            event.currentTarget.value = "";
          }
        }}
      />
      <Button loading={isSubmitting} icon={<Plus className="h-4 w-4" />}>
        Ekle
      </Button>
    </form>
  );
}
