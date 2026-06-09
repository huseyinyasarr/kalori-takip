import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, Timestamp, updateDoc, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { Food, FoodLog, Plate } from "../../types";
import { calculateFluidFromFood, calculateMacroFromFood } from "../../utils/calculations";
import { getTodayDateKey } from "../../utils/date";

export function foodLogsCollection(uid: string) {
  return collection(db, "users", uid, "foodLogs");
}

export function subscribeFoodLogsByDate(
  uid: string,
  dateKey: string,
  onNext: (logs: FoodLog[]) => void,
  onError: () => void,
) {
  return onSnapshot(
    query(foodLogsCollection(uid), where("dateKey", "==", dateKey)),
    (snapshot) => {
      const logs = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }) as FoodLog)
        .filter((log) => log.entryType !== "water")
        .sort((a, b) => b.consumedAt.toMillis() - a.consumedAt.toMillis());
      onNext(logs);
    },
    onError,
  );
}

export function subscribeFoodLogsFromDate(
  uid: string,
  startDateKey: string,
  onNext: (logs: FoodLog[]) => void,
  onError: () => void,
) {
  return onSnapshot(
    query(foodLogsCollection(uid), where("dateKey", ">=", startDateKey), orderBy("dateKey", "asc")),
    (snapshot) => {
      onNext(
        snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }) as FoodLog)
          .filter((log) => log.entryType !== "water"),
      );
    },
    onError,
  );
}

export async function createFoodLog(uid: string, food: Food, grams: number, dateKey = getTodayDateKey()) {
  const macros = calculateMacroFromFood(food, grams);
  const fluidMilliliters = calculateFluidFromFood(food, grams);
  await addDoc(foodLogsCollection(uid), {
    entryType: "food",
    dateKey,
    consumedAt: Timestamp.now(),
    foodId: food.id,
    foodSource: food.source ?? "private",
    foodNameSnapshot: food.name,
    grams,
    calories: macros.calories,
    protein: macros.protein,
    fat: macros.fat,
    carbs: macros.carbs,
    fluidMilliliters,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function createPlateLog(uid: string, plate: Plate, portions: number, dateKey = getTodayDateKey()) {
  await addDoc(foodLogsCollection(uid), {
    entryType: "food",
    dateKey,
    consumedAt: Timestamp.now(),
    foodId: `plate:${plate.id}`,
    foodSource: plate.source ?? "private",
    foodNameSnapshot: plate.name,
    grams: Math.round(plate.totalGrams * portions * 10) / 10,
    calories: Math.round(plate.calories * portions),
    protein: Math.round(plate.protein * portions * 10) / 10,
    fat: Math.round(plate.fat * portions * 10) / 10,
    carbs: Math.round(plate.carbs * portions * 10) / 10,
    fluidMilliliters: Math.round((plate.fluidMilliliters ?? 0) * portions),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateFoodLogGrams(uid: string, log: FoodLog, sourceFood: Food | undefined, grams: number) {
  const foodValues = sourceFood
    ? sourceFood
    : {
        name: log.foodNameSnapshot,
        caloriesPer100g: (log.calories / log.grams) * 100,
        proteinPer100g: (log.protein / log.grams) * 100,
        fatPer100g: (log.fat / log.grams) * 100,
        carbPer100g: (log.carbs / log.grams) * 100,
        fluidRatio: log.fluidMilliliters ? log.fluidMilliliters / log.grams : 0,
      };
  const macros = calculateMacroFromFood(foodValues, grams);
  const fluidMilliliters = calculateFluidFromFood(foodValues, grams);

  await updateDoc(doc(db, "users", uid, "foodLogs", log.id), {
    grams,
    calories: macros.calories,
    protein: macros.protein,
    fat: macros.fat,
    carbs: macros.carbs,
    fluidMilliliters,
    updatedAt: serverTimestamp(),
  });
}

export async function updateFoodLogEntry(uid: string, log: FoodLog, sourceFood: Food | undefined, grams: number) {
  const foodValues = sourceFood
    ? sourceFood
    : {
        name: log.foodNameSnapshot,
        caloriesPer100g: (log.calories / log.grams) * 100,
        proteinPer100g: (log.protein / log.grams) * 100,
        fatPer100g: (log.fat / log.grams) * 100,
        carbPer100g: (log.carbs / log.grams) * 100,
        fluidRatio: log.fluidMilliliters ? log.fluidMilliliters / log.grams : 0,
      };
  const macros = calculateMacroFromFood(foodValues, grams);
  const fluidMilliliters = calculateFluidFromFood(foodValues, grams);

  await updateDoc(doc(db, "users", uid, "foodLogs", log.id), {
    ...(sourceFood
      ? {
          foodId: sourceFood.id,
          foodSource: sourceFood.source ?? "private",
          foodNameSnapshot: sourceFood.name,
        }
      : {}),
    grams,
    calories: macros.calories,
    protein: macros.protein,
    fat: macros.fat,
    carbs: macros.carbs,
    fluidMilliliters,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteFoodLog(uid: string, logId: string) {
  await deleteDoc(doc(db, "users", uid, "foodLogs", logId));
}
