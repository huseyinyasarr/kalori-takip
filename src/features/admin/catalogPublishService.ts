import { doc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import type { Food, Plate, WaterGlass } from "../../types";
import { getFoodNutritionUnit, normalizeFoodKind, normalizeFoodPortions } from "../../utils/calculations";
import { foodsCollection, globalFoodsCollection } from "../foods/foodService";
import { globalPlatesCollection } from "../plates/plateService";
import { globalWaterGlassesCollection } from "../water/waterService";

export interface PublishPrivateCatalogResult {
  foods: number;
  plates: number;
  waterGlasses: number;
}

export async function publishPrivateCatalog(uid: string): Promise<PublishPrivateCatalogResult> {
  const snapshot = await getDocs(foodsCollection(uid));
  const result: PublishPrivateCatalogResult = {
    foods: 0,
    plates: 0,
    waterGlasses: 0,
  };

  await Promise.all(
    snapshot.docs.map(async (item) => {
      const data = item.data();
      const globalId = `legacy-${item.id}`;
      const importedFromPath = `users/${uid}/foods/${item.id}`;

      if (data.entryType === "waterGlass") {
        const glass = data as WaterGlass;
        if (!glass.name || !glass.milliliters) return;

        await setDoc(doc(globalWaterGlassesCollection(), globalId), {
          name: glass.name,
          milliliters: Number(glass.milliliters) || 0,
          size: glass.size ?? "medium",
          entryType: "waterGlass",
          visibility: "public",
          status: "approved",
          ownerUid: uid,
          createdByRole: "admin",
          importedFromPath,
          updatedAt: serverTimestamp(),
        });
        result.waterGlasses += 1;
        return;
      }

      if (data.entryType === "plate") {
        const plate = data as Plate;
        if (!plate.name || !Array.isArray(plate.ingredients)) return;

        const ingredients = plate.ingredients.map((ingredient) => ({
          ...ingredient,
          foodSource: ingredient.foodSource ?? "private",
          fluidMilliliters: ingredient.fluidMilliliters ?? 0,
        }));

        await setDoc(doc(globalPlatesCollection(), globalId), {
          name: plate.name,
          ingredients,
          totalGrams: Number(plate.totalGrams) || 0,
          calories: Number(plate.calories) || 0,
          protein: Number(plate.protein) || 0,
          fat: Number(plate.fat) || 0,
          carbs: Number(plate.carbs) || 0,
          fluidMilliliters: Number(plate.fluidMilliliters) || ingredients.reduce((sum, ingredient) => sum + (ingredient.fluidMilliliters ?? 0), 0),
          entryType: "plate",
          visibility: "public",
          status: "approved",
          ownerUid: uid,
          createdByRole: "admin",
          importedFromPath,
          updatedAt: serverTimestamp(),
        });
        result.plates += 1;
        return;
      }

      const food = data as Food;
      if (!food.name) return;

      await setDoc(doc(globalFoodsCollection(), globalId), {
        name: food.name,
        description: food.description ?? "",
        kind: normalizeFoodKind(food.kind),
        nutritionUnit: getFoodNutritionUnit(food),
        caloriesPer100g: Number(food.caloriesPer100g) || 0,
        proteinPer100g: Number(food.proteinPer100g) || 0,
        fatPer100g: Number(food.fatPer100g) || 0,
        carbPer100g: Number(food.carbPer100g) || 0,
        fluidRatio: Math.max(0, Math.min(Number(food.fluidRatio) || 0, 1)),
        portions: normalizeFoodPortions(food.portions),
        entryType: "food",
        visibility: "public",
        status: "approved",
        ownerUid: uid,
        createdByRole: "admin",
        importedFromPath,
        updatedAt: serverTimestamp(),
      });
      result.foods += 1;
    }),
  );

  return result;
}
