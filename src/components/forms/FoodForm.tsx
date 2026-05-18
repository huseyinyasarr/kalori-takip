import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Food, FoodInput } from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

const foodSchema = z.object({
  name: z.string().trim().min(1, "Yemek adı boş olamaz."),
  caloriesPer100g: z.coerce.number().min(0, "Kalori negatif olamaz."),
  proteinPer100g: z.coerce.number().min(0, "Protein negatif olamaz."),
  fatPer100g: z.coerce.number().min(0, "Yağ negatif olamaz."),
  carbPer100g: z.coerce.number().min(0, "Karbonhidrat negatif olamaz."),
});

interface FoodFormProps {
  editingFood?: Food | null;
  onSubmit: (payload: FoodInput) => Promise<void>;
  onCancel?: () => void;
}

export function FoodForm({ editingFood, onSubmit, onCancel }: FoodFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FoodInput>({
    resolver: zodResolver(foodSchema),
    defaultValues: {
      name: "",
      caloriesPer100g: 0,
      proteinPer100g: 0,
      fatPer100g: 0,
      carbPer100g: 0,
    },
  });
  const fatField = register("fatPer100g");
  const carbField = register("carbPer100g");

  useEffect(() => {
    if (editingFood) reset(editingFood);
  }, [editingFood, reset]);

  return (
    <form
      className="grid gap-3"
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(values);
        reset();
      })}
    >
      <Input label="Yemek/besin adı" error={errors.name?.message} {...register("name")} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Kalori / 100 g" type="number" step="0.1" error={errors.caloriesPer100g?.message} {...register("caloriesPer100g")} />
        <Input label="Protein / 100 g" type="number" step="0.1" error={errors.proteinPer100g?.message} {...register("proteinPer100g")} />
        <Input
          label="Yağ / 100 g"
          type="number"
          step="0.1"
          error={errors.fatPer100g?.message}
          {...fatField}
          onFocus={(event) => {
            if (event.currentTarget.value === "0") {
              event.currentTarget.value = "";
            }
          }}
        />
        <Input
          label="Karbonhidrat / 100 g"
          type="number"
          step="0.1"
          error={errors.carbPer100g?.message}
          {...carbField}
          onFocus={(event) => {
            if (event.currentTarget.value === "0") {
              event.currentTarget.value = "";
            }
          }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button loading={isSubmitting}>{editingFood ? "Güncelle" : "Kaydet"}</Button>
        {editingFood && onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Vazgeç
          </Button>
        ) : null}
      </div>
    </form>
  );
}
