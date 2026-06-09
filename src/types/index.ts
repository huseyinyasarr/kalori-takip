import type { Timestamp } from "firebase/firestore";

export type WeightLogSource = "measured" | "manual" | "skipped";
export type UserRole = "admin" | "editor" | "user";
export type CatalogSource = "private" | "global";
export type CatalogVisibility = "private" | "public";
export type ApprovalStatus = "approved" | "pending" | "rejected";
export type FoodKind = "solid" | "liquid";
export type FoodNutritionUnit = "g" | "ml";

export interface FoodPortion {
  id?: string;
  name: string;
  grams: number;
}

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
  description?: string;
  kind?: FoodKind;
  nutritionUnit?: FoodNutritionUnit;
  caloriesPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  carbPer100g: number;
  fluidRatio?: number;
  portions?: FoodPortion[];
  plateIngredients?: PlateIngredient[];
  plateTotalGrams?: number;
  plateFluidMilliliters?: number;
  source?: CatalogSource;
  visibility?: CatalogVisibility;
  status?: ApprovalStatus;
  ownerUid?: string | null;
  createdByRole?: UserRole;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type FoodInput = Pick<
  Food,
  | "name"
  | "description"
  | "kind"
  | "nutritionUnit"
  | "caloriesPer100g"
  | "proteinPer100g"
  | "fatPer100g"
  | "carbPer100g"
  | "fluidRatio"
  | "portions"
  | "visibility"
>;

export interface PlateIngredient extends DailyTotals {
  foodId: string;
  foodSource?: CatalogSource;
  foodNameSnapshot: string;
  grams: number;
  fluidMilliliters?: number;
}

export interface Plate extends DailyTotals {
  id: string;
  entryType?: "plate";
  name: string;
  ingredients: PlateIngredient[];
  totalGrams: number;
  fluidMilliliters?: number;
  source?: CatalogSource;
  visibility?: CatalogVisibility;
  status?: ApprovalStatus;
  ownerUid?: string | null;
  createdByRole?: UserRole;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type PlateInput = Pick<
  Plate,
  "name" | "ingredients" | "totalGrams" | "calories" | "protein" | "fat" | "carbs" | "fluidMilliliters" | "visibility"
>;

export interface FoodLog {
  id: string;
  entryType?: "food" | "water";
  dateKey: string;
  consumedAt: Timestamp;
  foodId: string;
  foodSource?: CatalogSource;
  foodNameSnapshot: string;
  grams: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fluidMilliliters?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface WaterGlass {
  id: string;
  entryType: "waterGlass";
  name: string;
  milliliters: number;
  size?: WaterGlassSize;
  source?: CatalogSource;
  visibility?: CatalogVisibility;
  status?: ApprovalStatus;
  ownerUid?: string | null;
  createdByRole?: UserRole;
  originalGlobalGlassId?: string;
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
  glassSource?: CatalogSource;
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
