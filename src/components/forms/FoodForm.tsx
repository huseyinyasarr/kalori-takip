import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import type { CatalogVisibility, Food, FoodInput, FoodKind, FoodNutritionUnit, UserRole } from "../../types";
import { getDefaultFoodNutritionUnit, getFoodNutritionUnit, normalizeFoodKind, normalizeFoodPortions } from "../../utils/calculations";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

const portionSchema = z.object({
  name: z.string().trim().min(1, "Ölçü adı boş olamaz."),
  grams: z.coerce.number().positive("Gram/ml pozitif olmalı."),
});

const foodSchema = z.object({
  name: z.string().trim().min(1, "Besin adı boş olamaz."),
  description: z.string().trim().optional(),
  kind: z.enum(["solid", "liquid"]),
  nutritionUnit: z.enum(["g", "ml"]),
  caloriesPer100g: z.coerce.number().min(0, "Kalori negatif olamaz."),
  proteinPer100g: z.coerce.number().min(0, "Protein negatif olamaz."),
  fatPer100g: z.coerce.number().min(0, "Yağ negatif olamaz."),
  carbPer100g: z.coerce.number().min(0, "Karbonhidrat negatif olamaz."),
  fluidRatioPercent: z.coerce.number().min(0, "Sıvı oranı 0'dan küçük olamaz.").max(100, "Sıvı oranı 100'den büyük olamaz."),
  portions: z.array(portionSchema).min(1, "En az bir ölçü eklemelisin."),
  visibility: z.enum(["private", "public"]),
});

type FoodFormValues = z.infer<typeof foodSchema>;

interface FoodFormProps {
  editingFood?: Food | null;
  role: UserRole;
  visibilityMode?: "editable" | "privateOnly" | "publicOnly";
  onSubmit: (payload: FoodInput) => Promise<void>;
  validateBeforeSubmit?: (payload: FoodInput, editingFood: Food | null) => string | null;
  onCancel?: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

const kindLabels: Record<FoodKind, string> = {
  solid: "Yemek",
  liquid: "İçecek",
};

const unitLabels: Record<FoodNutritionUnit, string> = {
  g: "Gram (g)",
  ml: "Mililitre (ml)",
};

const kindDefaultFluidRatioPercent: Record<FoodKind, number> = {
  solid: 0,
  liquid: 100,
};

export function FoodForm({
  editingFood,
  role,
  visibilityMode = "editable",
  onSubmit,
  validateBeforeSubmit,
  onCancel,
  onDirtyChange,
}: FoodFormProps) {
  const canCreatePublic = role === "admin" || role === "editor";
  const isPublicOnly = visibilityMode === "publicOnly";
  const isPrivateOnly = visibilityMode === "privateOnly";
  const isEditing = Boolean(editingFood);
  const editableVisibility: CatalogVisibility = isPublicOnly ? "public" : editingFood?.source === "global" ? "public" : "private";
  const {
    control,
    clearErrors,
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FoodFormValues>({
    resolver: zodResolver(foodSchema),
    defaultValues: buildDefaultValues(null, isPublicOnly),
  });
  const { fields, append, remove } = useFieldArray({ control, name: "portions" });
  const selectedNutritionUnit = useWatch({ control, name: "nutritionUnit" });
  const kindField = register("kind");
  const nutritionUnitField = register("nutritionUnit");
  const caloriesField = register("caloriesPer100g");
  const proteinField = register("proteinPer100g");
  const fatField = register("fatPer100g");
  const carbField = register("carbPer100g");
  const fluidRatioField = register("fluidRatioPercent");

  useEffect(() => {
    reset(buildDefaultValues(editingFood ?? null, isPublicOnly));
  }, [editingFood, isPublicOnly, reset]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  return (
    <form
      className="grid gap-4"
      onSubmit={handleSubmit(async (values) => {
        const visibility = isPrivateOnly ? "private" : isPublicOnly || isEditing ? editableVisibility : values.visibility;
        const payload: FoodInput = {
          name: values.name,
          description: values.description ?? "",
          kind: values.kind,
          caloriesPer100g: values.caloriesPer100g,
          proteinPer100g: values.proteinPer100g,
          fatPer100g: values.fatPer100g,
          carbPer100g: values.carbPer100g,
          fluidRatio: values.fluidRatioPercent / 100,
          portions: normalizeFoodPortions(values.portions),
          visibility,
          nutritionUnit: values.nutritionUnit,
        };
        clearErrors("name");
        const validationError = validateBeforeSubmit?.(payload, editingFood ?? null);
        if (validationError) {
          setError("name", { type: "manual", message: validationError });
          return;
        }

        await onSubmit(payload);
        reset(buildDefaultValues(null, isPublicOnly));
      })}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_160px_180px]">
        <Input label="Besin/içecek adı" error={errors.name?.message} {...register("name")} />
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink/80">Tür</span>
          <select
            className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-mint"
            {...kindField}
            onChange={(event) => {
              kindField.onChange(event);
              const nextKind = event.target.value as FoodKind;
              setValue("nutritionUnit", getDefaultFoodNutritionUnit(nextKind), {
                shouldDirty: true,
                shouldValidate: true,
              });
              setValue("fluidRatioPercent", kindDefaultFluidRatioPercent[nextKind], {
                shouldDirty: true,
                shouldValidate: true,
              });
            }}
          >
            {Object.entries(kindLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink/80">Besin değeri birimi</span>
          <select
            className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-mint"
            {...nutritionUnitField}
          >
            {Object.entries(unitLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink/80">Kısa açıklama / not</span>
        <textarea
          className="min-h-20 w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-leaf focus:ring-2 focus:ring-mint"
          placeholder="Ev yapımı mercimek çorbası, paketli ürün notu, kaynak vb."
          {...register("description")}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label={`Kalori / 100 ${selectedNutritionUnit ?? "g"}`}
          type="number"
          step="0.1"
          error={errors.caloriesPer100g?.message}
          {...caloriesField}
          onFocus={(event) => {
            if (event.currentTarget.value === "0") event.currentTarget.value = "";
          }}
        />
        <Input
          label={`Protein / 100 ${selectedNutritionUnit ?? "g"}`}
          type="number"
          step="0.1"
          error={errors.proteinPer100g?.message}
          {...proteinField}
          onFocus={(event) => {
            if (event.currentTarget.value === "0") event.currentTarget.value = "";
          }}
        />
        <Input
          label={`Yağ / 100 ${selectedNutritionUnit ?? "g"}`}
          type="number"
          step="0.1"
          error={errors.fatPer100g?.message}
          {...fatField}
          onFocus={(event) => {
            if (event.currentTarget.value === "0") event.currentTarget.value = "";
          }}
        />
        <Input
          label={`Karbonhidrat / 100 ${selectedNutritionUnit ?? "g"}`}
          type="number"
          step="0.1"
          error={errors.carbPer100g?.message}
          {...carbField}
          onFocus={(event) => {
            if (event.currentTarget.value === "0") event.currentTarget.value = "";
          }}
        />
      </div>

      <Input
        label="Sıvı katkı oranı (%)"
        type="number"
        step="1"
        min="0"
        max="100"
        error={errors.fluidRatioPercent?.message}
        {...fluidRatioField}
        onFocus={(event) => {
          event.currentTarget.value = "";
        }}
      />
      <p className="-mt-2 text-xs text-ink/55">
        Örnek: su/soda 100, çorba 80, pilav/makarna 0. Besin değerleri 100 {selectedNutritionUnit ?? "g"} üzerinden hesaplanır.
      </p>

      <div className="mobile-reveal grid gap-2 rounded-md border border-ink/10 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink">Ölçüler</p>
            <p className="text-xs text-ink/55">Kepçe, bardak, adet gibi hızlı porsiyonlar.</p>
          </div>
          <Button type="button" variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => append({ name: "", grams: 100 })}>
            Ölçü
          </Button>
        </div>
        {errors.portions?.message ? <p className="text-xs font-medium text-coral">{errors.portions.message}</p> : null}
        <div className="mobile-list grid gap-2">
          {fields.map((field, index) => (
            <div key={field.id} className="grid gap-2 sm:grid-cols-[1fr_140px_auto] sm:items-end">
              <Input
                label="Ölçü adı"
                placeholder="Örn. 1 kepçe, 1 adet"
                className="placeholder:text-ink/35"
                error={errors.portions?.[index]?.name?.message}
                {...register(`portions.${index}.name`)}
                onFocus={(event) => {
                  event.currentTarget.value = "";
                }}
              />
              <Input
                label={selectedNutritionUnit === "ml" ? "Mililitre" : "Gram"}
                type="number"
                step="0.1"
                error={errors.portions?.[index]?.grams?.message}
                {...register(`portions.${index}.grams`)}
                onFocus={(event) => {
                  event.currentTarget.value = "";
                }}
              />
              <Button type="button" variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => remove(index)} disabled={fields.length === 1}>
                Sil
              </Button>
            </div>
          ))}
        </div>
      </div>

      {isPublicOnly ? (
        <p className="mobile-reveal rounded-md bg-cloud px-3 py-2 text-xs font-medium text-ink/60">
          {role === "admin"
            ? "Bu formdan eklenen besin global katalog için kaydedilir."
            : "Bu formdan eklenen besin global kataloğa kaydedilmek için admin onayına gönderilir."}
        </p>
      ) : canCreatePublic && !isPrivateOnly ? (
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink/80">Görünürlük</span>
          <select
            className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-mint disabled:bg-cloud disabled:text-ink/55"
            disabled={isEditing}
            {...register("visibility")}
          >
            <option value="private">Sadece ben</option>
            <option value="public">{role === "admin" ? "Herkese açık katalog" : "Herkese açık öneri"}</option>
          </select>
          {role === "editor" ? <span className="mt-1 block text-xs text-ink/55">Editör public kayıtları admin onayına düşer.</span> : null}
        </label>
      ) : isPrivateOnly ? (
        <p className="mobile-reveal rounded-md bg-cloud px-3 py-2 text-xs font-medium text-ink/60">Bu formdan eklenen besin yalnızca senin hesabında görünür.</p>
      ) : null}

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

function buildDefaultValues(food: Food | null, isPublicOnly = false): FoodFormValues {
  return {
    name: food?.name ?? "",
    description: food?.description ?? "",
    kind: normalizeFoodKind(food?.kind),
    nutritionUnit: getFoodNutritionUnit(food ?? { kind: "solid" }),
    caloriesPer100g: food?.caloriesPer100g ?? 0,
    proteinPer100g: food?.proteinPer100g ?? 0,
    fatPer100g: food?.fatPer100g ?? 0,
    carbPer100g: food?.carbPer100g ?? 0,
    fluidRatioPercent: Math.round((food?.fluidRatio ?? 0) * 100),
    portions: food ? normalizeFoodPortions(food.portions) : [{ name: "", grams: 100 }],
    visibility: isPublicOnly || food?.source === "global" ? "public" : "private",
  };
}
