import { addDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { foodsCollection } from "../foods/foodService";
import type { Plate, PlateInput } from "../../types";

export function platesCollection(uid: string) {
  return foodsCollection(uid);
}

export function subscribePlates(uid: string, onNext: (plates: Plate[]) => void, onError: () => void) {
  return onSnapshot(
    query(platesCollection(uid), orderBy("name", "asc")),
    (snapshot) => {
      onNext(
        snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }) as Plate)
          .filter((plate) => plate.entryType === "plate"),
      );
    },
    onError,
  );
}

export async function createPlate(uid: string, payload: PlateInput) {
  await addDoc(platesCollection(uid), {
    ...payload,
    entryType: "plate",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updatePlate(uid: string, plateId: string, payload: PlateInput) {
  await updateDoc(doc(platesCollection(uid), plateId), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePlate(uid: string, plateId: string) {
  await deleteDoc(doc(platesCollection(uid), plateId));
}
