import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { Food, FoodInput, UserRole } from "../../types";
import { getFoodNutritionUnit, normalizeFoodKind, normalizeFoodPortions } from "../../utils/calculations";

export function foodsCollection(uid: string) {
  return collection(db, "users", uid, "foods");
}

export function globalFoodsCollection() {
  return collection(db, "globalFoods");
}

export function subscribeFoods(uid: string, onNext: (foods: Food[]) => void, onError: () => void) {
  let privateFoods: Food[] = [];
  let globalFoods: Food[] = [];
  let privateReady = false;
  let globalReady = false;

  const emit = () => {
    if (!privateReady || !globalReady) return;
    onNext([...globalFoods, ...privateFoods].sort((a, b) => a.name.localeCompare(b.name, "tr")));
  };

  const unsubscribePrivate = onSnapshot(
    query(foodsCollection(uid), orderBy("name", "asc")),
    (snapshot) => {
      privateFoods = snapshot.docs
        .map((item) => hydrateFood({ id: item.id, ...item.data() } as Food, "private", uid))
        .filter((food) => food.entryType !== "waterGlass" && food.entryType !== "plate");
      privateReady = true;
      emit();
    },
    onError,
  );

  const unsubscribeGlobal = onSnapshot(
    query(globalFoodsCollection(), where("status", "==", "approved")),
    (snapshot) => {
      globalFoods = snapshot.docs.map((item) => hydrateFood({ id: item.id, ...item.data() } as Food, "global"));
      globalReady = true;
      emit();
    },
    onError,
  );

  return () => {
    unsubscribePrivate();
    unsubscribeGlobal();
  };
}

export function subscribeUserGlobalFoods(uid: string, onNext: (foods: Food[]) => void, onError: () => void) {
  return onSnapshot(
    query(globalFoodsCollection(), where("ownerUid", "==", uid)),
    (snapshot) => {
      onNext(snapshot.docs.map((item) => hydrateFood({ id: item.id, ...item.data() } as Food, "global")));
    },
    onError,
  );
}

export function subscribeAllGlobalFoods(onNext: (foods: Food[]) => void, onError: () => void) {
  return onSnapshot(
    query(globalFoodsCollection(), orderBy("name", "asc")),
    (snapshot) => {
      onNext(snapshot.docs.map((item) => hydrateFood({ id: item.id, ...item.data() } as Food, "global")));
    },
    onError,
  );
}

export function subscribePendingGlobalFoods(onNext: (foods: Food[]) => void, onError: () => void) {
  return onSnapshot(
    query(globalFoodsCollection(), where("status", "==", "pending")),
    (snapshot) => {
      onNext(
        snapshot.docs
          .map((item) => hydrateFood({ id: item.id, ...item.data() } as Food, "global"))
          .sort((a, b) => a.name.localeCompare(b.name, "tr")),
      );
    },
    onError,
  );
}

export async function createFood(uid: string, payload: FoodInput, role: UserRole = "user") {
  const sanitizedPayload = sanitizeFoodPayload(payload);
  const shouldCreateGlobal = sanitizedPayload.visibility === "public" && (role === "admin" || role === "editor");

  if (shouldCreateGlobal) {
    await addDoc(globalFoodsCollection(), {
      ...sanitizedPayload,
      entryType: "food",
      visibility: "public",
      status: role === "admin" ? "approved" : "pending",
      ownerUid: uid,
      createdByRole: role,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await addDoc(foodsCollection(uid), {
    ...sanitizedPayload,
    entryType: "food",
    visibility: "private",
    status: "approved",
    ownerUid: uid,
    createdByRole: role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateFood(uid: string, food: Food, payload: FoodInput, role: UserRole = "user") {
  const sanitizedPayload = sanitizeFoodPayload(payload);

  if (food.source === "global") {
    await updateDoc(doc(db, "globalFoods", food.id), {
      ...sanitizedPayload,
      visibility: "public",
      status: role === "admin" ? "approved" : "pending",
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await updateDoc(doc(db, "users", uid, "foods", food.id), {
    ...sanitizedPayload,
    visibility: "private",
    status: "approved",
    updatedAt: serverTimestamp(),
  });
}

export async function deleteFood(uid: string, food: Food) {
  if (food.source === "global") {
    await deleteDoc(doc(db, "globalFoods", food.id));
    return;
  }

  await deleteDoc(doc(db, "users", uid, "foods", food.id));
}

export async function approveGlobalFood(foodId: string) {
  await updateDoc(doc(db, "globalFoods", foodId), {
    status: "approved",
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function rejectGlobalFood(foodId: string) {
  await updateDoc(doc(db, "globalFoods", foodId), {
    status: "rejected",
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

function hydrateFood(food: Food, source: "private" | "global", ownerUid?: string): Food {
  return {
    ...food,
    kind: normalizeFoodKind(food.kind),
    nutritionUnit: getFoodNutritionUnit(food),
    fluidRatio: food.fluidRatio ?? 0,
    portions: normalizeFoodPortions(food.portions),
    source,
    visibility: source === "global" ? "public" : "private",
    status: food.status ?? "approved",
    ownerUid: food.ownerUid ?? ownerUid ?? null,
  };
}

function sanitizeFoodPayload(payload: FoodInput): FoodInput {
  return {
    name: payload.name.trim(),
    description: payload.description?.trim() || "",
    kind: normalizeFoodKind(payload.kind),
    nutritionUnit: getFoodNutritionUnit(payload),
    caloriesPer100g: Number(payload.caloriesPer100g) || 0,
    proteinPer100g: Number(payload.proteinPer100g) || 0,
    fatPer100g: Number(payload.fatPer100g) || 0,
    carbPer100g: Number(payload.carbPer100g) || 0,
    fluidRatio: Math.max(0, Math.min(Number(payload.fluidRatio) || 0, 1)),
    portions: normalizeFoodPortions(payload.portions),
    visibility: payload.visibility ?? "private",
  };
}
