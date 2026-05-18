import type { Timestamp } from "firebase/firestore";

export type WeightLogSource = "measured" | "manual" | "skipped";

export interface UserProfile {
  uid: string;
  email: string | null;
  photoURL: string | null;
  googleDisplayName: string | null;
  fullName: string;
  currentWeight: number;
  targetWeight: number;
  averageBurnKcal: number;
  dailyCalorieTarget: number;
  proteinTargetGram: number;
  minFatTargetGram: number;
  minCarbTargetGram: number;
  onboardingCompleted: boolean;
  lastWeightPromptDateKey?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Food {
  id: string;
  entryType?: "food" | "waterGlass" | "plate";
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  carbPer100g: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type FoodInput = Omit<Food, "id" | "createdAt" | "updatedAt">;

export interface PlateIngredient extends DailyTotals {
  foodId: string;
  foodNameSnapshot: string;
  grams: number;
}

export interface Plate extends DailyTotals {
  id: string;
  entryType?: "plate";
  name: string;
  ingredients: PlateIngredient[];
  totalGrams: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type PlateInput = Omit<Plate, "id" | "createdAt" | "updatedAt">;

export interface FoodLog {
  id: string;
  entryType?: "food" | "water";
  dateKey: string;
  consumedAt: Timestamp;
  foodId: string;
  foodNameSnapshot: string;
  grams: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface WaterGlass {
  id: string;
  entryType: "waterGlass";
  name: string;
  milliliters: number;
  size?: WaterGlassSize;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type WaterGlassSize = "small" | "medium" | "large";

export type WaterGlassInput = Omit<WaterGlass, "id" | "entryType" | "createdAt" | "updatedAt">;

export interface WaterLog {
  id: string;
  entryType: "water";
  dateKey: string;
  consumedAt: Timestamp;
  glassId: string;
  glassNameSnapshot: string;
  milliliters: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface WeightLog {
  id: string;
  dateKey: string;
  weight: number | null;
  source: WeightLogSource;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface DailyTotals {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}
