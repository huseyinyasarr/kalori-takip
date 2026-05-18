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
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { Food, FoodInput } from "../../types";

export function foodsCollection(uid: string) {
  return collection(db, "users", uid, "foods");
}

export function subscribeFoods(uid: string, onNext: (foods: Food[]) => void, onError: () => void) {
  return onSnapshot(
    query(foodsCollection(uid), orderBy("name", "asc")),
    (snapshot) => {
      onNext(
        snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }) as Food)
          .filter((food) => food.entryType !== "waterGlass" && food.entryType !== "plate"),
      );
    },
    onError,
  );
}

export async function createFood(uid: string, payload: FoodInput) {
  await addDoc(foodsCollection(uid), {
    ...payload,
    entryType: "food",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateFood(uid: string, foodId: string, payload: FoodInput) {
  await updateDoc(doc(db, "users", uid, "foods", foodId), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteFood(uid: string, foodId: string) {
  await deleteDoc(doc(db, "users", uid, "foods", foodId));
}
