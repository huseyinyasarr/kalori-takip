import { zodResolver } from "@hookform/resolvers/zod";
import { GlassWater } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { WaterGlass, WaterGlassInput, WaterGlassSize } from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

const waterGlassSchema = z.object({
  name: z.string().trim().min(1, "Bardak adı boş olamaz."),
  milliliters: z.coerce.number().positive("Mililitre pozitif sayı olmalı."),
  size: z.enum(["small", "medium", "large"]),
});

const glassSizeOptions: Array<{ value: WaterGlassSize; label: string; iconClass: string }> = [
  { value: "small", label: "Küçük", iconClass: "h-6 w-6" },
  { value: "medium", label: "Orta", iconClass: "h-8 w-8" },
  { value: "large", label: "Büyük", iconClass: "h-10 w-10" },
];

interface WaterGlassFormProps {
  editingGlass?: WaterGlass | null;
  onSubmit: (payload: WaterGlassInput) => Promise<void>;
  onCancel?: () => void;
}

export function WaterGlassForm({ editingGlass, onSubmit, onCancel }: WaterGlassFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WaterGlassInput>({
    resolver: zodResolver(waterGlassSchema),
    defaultValues: {
      name: "",
      milliliters: 250,
      size: "medium",
    },
  });

  useEffect(() => {
    if (editingGlass) reset({ ...editingGlass, size: editingGlass.size ?? "medium" });
  }, [editingGlass, reset]);

  return (
    <form
      className="grid gap-3"
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(values);
        reset({ name: "", milliliters: 250, size: "medium" });
      })}
    >
      <Input label="Bardak adı" placeholder="Su bardağı" error={errors.name?.message} {...register("name")} />
      <Input label="Mililitre" type="number" step="10" error={errors.milliliters?.message} {...register("milliliters")} />
      <div>
        <span className="mb-2 block text-sm font-medium text-ink/80">Bardak şekli</span>
        <div className="grid grid-cols-3 gap-2">
          {glassSizeOptions.map((option) => (
            <label key={option.value} className="cursor-pointer">
              <input className="peer sr-only" type="radio" value={option.value} {...register("size")} />
              <span className="mobile-choice grid min-h-24 place-items-center rounded-md border border-ink/10 bg-white p-3 text-center transition peer-checked:border-leaf peer-checked:bg-mint peer-focus:ring-2 peer-focus:ring-leaf">
                <GlassWater className={`${option.iconClass} text-leaf`} />
                <span className="mt-2 text-xs font-semibold text-ink">{option.label}</span>
              </span>
            </label>
          ))}
        </div>
        {errors.size ? <span className="mt-1 block text-xs font-medium text-coral">{errors.size.message}</span> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button loading={isSubmitting}>{editingGlass ? "Güncelle" : "Kaydet"}</Button>
        {editingGlass && onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Vazgeç
          </Button>
        ) : null}
      </div>
    </form>
  );
}
