import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Food } from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

const schema = z.object({
  foodId: z.string().min(1, "Yemek seçmelisin."),
  grams: z.coerce.number().positive("Gram pozitif sayı olmalı."),
});

export function AddFoodLogForm({ foods, onAdd }: { foods: Food[]; onAdd: (food: Food, grams: number) => Promise<void> }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ foodId: string; grams: number }>({
    resolver: zodResolver(schema),
    defaultValues: { foodId: "", grams: 100 },
  });

  return (
    <form
      className="grid gap-3 md:grid-cols-[1fr_160px_auto] md:items-end"
      onSubmit={handleSubmit(async ({ foodId, grams }) => {
        const food = foods.find((item) => item.id === foodId);
        if (!food) return;
        await onAdd(food, grams);
        reset({ foodId: "", grams: 100 });
      })}
    >
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink/80">Yemek</span>
        <select className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-mint" {...register("foodId")}>
          <option value="">Seç</option>
          {foods.map((food) => (
            <option key={food.id} value={food.id}>
              {food.name}
            </option>
          ))}
        </select>
        {errors.foodId ? <span className="mt-1 block text-xs font-medium text-coral">{errors.foodId.message}</span> : null}
      </label>
      <Input label="Gram" type="number" step="0.1" error={errors.grams?.message} {...register("grams")} />
      <Button loading={isSubmitting} icon={<Plus className="h-4 w-4" />}>
        Ekle
      </Button>
    </form>
  );
}
