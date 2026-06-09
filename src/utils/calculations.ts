import type { DailyTotals, Food, FoodInput, FoodKind, FoodNutritionUnit, FoodPortion, Plate, UserProfile } from "../types";
import { getTodayDateKey, isAfterLocalWeightPromptTime } from "./date";

const roundOne = (value: number) => Math.round(value * 10) / 10;

export const DEFAULT_PURE_WATER_TARGET_LITER = 2;
export const DEFAULT_FOOD_PORTIONS: FoodPortion[] = [{ id: "100g", name: "100 gram", grams: 100 }];

export function normalizeFoodKind(kind: unknown): FoodKind {
  return kind === "liquid" || kind === "mixed" ? "liquid" : "solid";
}

export function getDefaultFoodNutritionUnit(kind: FoodKind | undefined): FoodNutritionUnit {
  return kind === "solid" ? "g" : "ml";
}

export function getFoodNutritionUnit(food: Pick<Food, "kind" | "nutritionUnit"> | Pick<FoodInput, "kind" | "nutritionUnit">): FoodNutritionUnit {
  return food.nutritionUnit ?? getDefaultFoodNutritionUnit(normalizeFoodKind(food.kind));
}

export function calculateAverageBurnKcal(currentWeight: number) {
  return Math.round(currentWeight * 33);
}

export function calculateDailyCalorieTarget(currentWeight: number, targetWeight: number) {
  const averageBurnKcal = calculateAverageBurnKcal(currentWeight);
  if (targetWeight < currentWeight) return Math.round(averageBurnKcal - 400);
  if (targetWeight > currentWeight) return Math.round(averageBurnKcal + 400);
  return averageBurnKcal;
}

export function calculateProteinTarget(targetWeight: number) {
  return roundOne(targetWeight * 2.2);
}

export function calculateMinFatTarget(dailyCalorieTarget: number) {
  return roundOne((dailyCalorieTarget * 0.2) / 9);
}

export function calculateMinCarbTarget(currentWeight: number) {
  return roundOne(currentWeight);
}

export function calculateDailyWaterTargetLiter(currentWeight: number) {
  return roundOne(currentWeight / 22);
}

export function calculateTargets(currentWeight: number, targetWeight: number) {
  const averageBurnKcal = calculateAverageBurnKcal(currentWeight);
  const dailyCalorieTarget = calculateDailyCalorieTarget(currentWeight, targetWeight);

  return {
    averageBurnKcal,
    dailyCalorieTarget,
    proteinTargetGram: calculateProteinTarget(targetWeight),
    minFatTargetGram: calculateMinFatTarget(dailyCalorieTarget),
    minCarbTargetGram: calculateMinCarbTarget(currentWeight),
  };
}

export function calculateMacroFromFood(
  food: Pick<FoodInput, "caloriesPer100g" | "proteinPer100g" | "fatPer100g" | "carbPer100g">,
  grams: number,
): DailyTotals {
  const ratio = grams / 100;

  return {
    calories: Math.round(food.caloriesPer100g * ratio),
    protein: roundOne(food.proteinPer100g * ratio),
    fat: roundOne(food.fatPer100g * ratio),
    carbs: roundOne(food.carbPer100g * ratio),
  };
}

export function calculateFluidFromFood(food: Pick<Food, "fluidRatio"> | Pick<FoodInput, "fluidRatio">, grams: number) {
  return Math.round(grams * Math.max(0, Math.min(food.fluidRatio ?? 0, 1)));
}

export function convertGlobalPlateToFood(plate: Plate): Food {
  const totalGrams = Math.max(Number(plate.totalGrams) || 0, 1);

  return {
    id: `plate:${plate.id}`,
    entryType: "plate",
    name: plate.name,
    description: `Global tabak: ${plate.ingredients.map((item) => `${item.foodNameSnapshot} ${item.grams} g`).join(" + ")}`,
    kind: "solid",
    nutritionUnit: "g",
    caloriesPer100g: Math.round((plate.calories / totalGrams) * 100),
    proteinPer100g: roundOne((plate.protein / totalGrams) * 100),
    fatPer100g: roundOne((plate.fat / totalGrams) * 100),
    carbPer100g: roundOne((plate.carbs / totalGrams) * 100),
    fluidRatio: Math.max(0, Math.min((plate.fluidMilliliters ?? 0) / totalGrams, 1)),
    portions: [{ id: "one-plate", name: "1 tabak", grams: plate.totalGrams }],
    plateIngredients: plate.ingredients.map((ingredient) => ({ ...ingredient })),
    plateTotalGrams: plate.totalGrams,
    plateFluidMilliliters: plate.fluidMilliliters ?? 0,
    source: "global",
    visibility: "public",
    status: plate.status ?? "approved",
    ownerUid: plate.ownerUid ?? null,
    createdByRole: plate.createdByRole,
    createdAt: plate.createdAt,
    updatedAt: plate.updatedAt,
  };
}

export function shouldAskWeightToday(userProfile: UserProfile) {
  const today = getTodayDateKey();
  return isAfterLocalWeightPromptTime() && userProfile.lastWeightPromptDateKey !== today;
}

export function sumDailyTotals<T extends DailyTotals>(items: T[]): DailyTotals {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: roundOne(acc.protein + item.protein),
      fat: roundOne(acc.fat + item.fat),
      carbs: roundOne(acc.carbs + item.carbs),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 },
  );
}

export function sumWaterMilliliters<T extends { milliliters: number }>(items: T[]) {
  return items.reduce((total, item) => total + item.milliliters, 0);
}

export function sumFoodFluidMilliliters<T extends { fluidMilliliters?: number }>(items: T[]) {
  return items.reduce((total, item) => total + (item.fluidMilliliters ?? 0), 0);
}

export function normalizeFoodPortions(portions: FoodPortion[] | undefined) {
  const normalized = (portions ?? [])
    .map((portion) => ({
      id: portion.id || portion.name.toLocaleLowerCase("tr-TR").replace(/\s+/g, "-"),
      name: portion.name.trim(),
      grams: Number(portion.grams),
    }))
    .filter((portion) => portion.name && portion.grams > 0);

  return normalized.length ? normalized : DEFAULT_FOOD_PORTIONS;
}
