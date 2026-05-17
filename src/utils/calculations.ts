import type { DailyTotals, FoodInput, UserProfile } from "../types";
import { getTodayDateKey, isAfterLocalWeightPromptTime } from "./date";

const roundOne = (value: number) => Math.round(value * 10) / 10;

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

export function calculateMacroFromFood(food: FoodInput, grams: number): DailyTotals {
  const ratio = grams / 100;

  return {
    calories: Math.round(food.caloriesPer100g * ratio),
    protein: roundOne(food.proteinPer100g * ratio),
    fat: roundOne(food.fatPer100g * ratio),
    carbs: roundOne(food.carbPer100g * ratio),
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
