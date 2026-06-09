import type { CatalogSource, Food, Plate, WaterGlass } from "../types";

export function getFoodCatalogKey(food: Pick<Food, "id" | "source">) {
  return `${food.source ?? "private"}:${food.id}`;
}

export function getPlateCatalogKey(plate: Pick<Plate, "id" | "source">) {
  return `${plate.source ?? "private"}:${plate.id}`;
}

export function getWaterGlassCatalogKey(glass: Pick<WaterGlass, "id" | "source">) {
  return `${glass.source ?? "private"}:${glass.id}`;
}

export function isSameFoodReference(food: Pick<Food, "id" | "source">, foodId: string, source?: CatalogSource) {
  if (source) {
    return food.id === foodId && (food.source ?? "private") === source;
  }

  return food.id === foodId;
}

export function isSamePlateReference(plate: Pick<Plate, "id" | "source">, plateId: string, source?: CatalogSource) {
  if (source) {
    return plate.id === plateId && (plate.source ?? "private") === source;
  }

  return plate.id === plateId;
}
