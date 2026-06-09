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
import type { Plate, PlateInput, UserRole } from "../../types";
import { foodsCollection } from "../foods/foodService";

export function platesCollection(uid: string) {
  return foodsCollection(uid);
}

export function globalPlatesCollection() {
  return collection(db, "globalPlates");
}

export function subscribePlates(uid: string, onNext: (plates: Plate[]) => void, onError: () => void) {
  let privatePlates: Plate[] = [];
  let globalPlates: Plate[] = [];
  let privateReady = false;
  let globalReady = false;

  const emit = () => {
    if (!privateReady || !globalReady) return;
    onNext([...globalPlates, ...privatePlates].sort((a, b) => a.name.localeCompare(b.name, "tr")));
  };

  const unsubscribePrivate = onSnapshot(
    query(platesCollection(uid), orderBy("name", "asc")),
    (snapshot) => {
      privatePlates = snapshot.docs
        .map((item) => hydratePlate({ id: item.id, ...item.data() } as Plate, "private", uid))
        .filter((plate) => plate.entryType === "plate");
      privateReady = true;
      emit();
    },
    onError,
  );

  const unsubscribeGlobal = onSnapshot(
    query(globalPlatesCollection(), where("status", "==", "approved")),
    (snapshot) => {
      globalPlates = snapshot.docs.map((item) => hydratePlate({ id: item.id, ...item.data() } as Plate, "global"));
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

export function subscribeUserGlobalPlates(uid: string, onNext: (plates: Plate[]) => void, onError: () => void) {
  return onSnapshot(
    query(globalPlatesCollection(), where("ownerUid", "==", uid)),
    (snapshot) => {
      onNext(snapshot.docs.map((item) => hydratePlate({ id: item.id, ...item.data() } as Plate, "global")));
    },
    onError,
  );
}

export function subscribePendingGlobalPlates(onNext: (plates: Plate[]) => void, onError: () => void) {
  return onSnapshot(
    query(globalPlatesCollection(), where("status", "==", "pending")),
    (snapshot) => {
      onNext(
        snapshot.docs
          .map((item) => hydratePlate({ id: item.id, ...item.data() } as Plate, "global"))
          .sort((a, b) => a.name.localeCompare(b.name, "tr")),
      );
    },
    onError,
  );
}

export async function createPlate(uid: string, payload: PlateInput, role: UserRole = "user") {
  const sanitizedPayload = sanitizePlatePayload(payload);
  const shouldCreateGlobal = sanitizedPayload.visibility === "public" && (role === "admin" || role === "editor");

  if (shouldCreateGlobal) {
    await addDoc(globalPlatesCollection(), {
      ...sanitizedPayload,
      entryType: "plate",
      visibility: "public",
      status: role === "admin" ? "approved" : "pending",
      ownerUid: uid,
      createdByRole: role,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await addDoc(platesCollection(uid), {
    ...sanitizedPayload,
    entryType: "plate",
    visibility: "private",
    status: "approved",
    ownerUid: uid,
    createdByRole: role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updatePlate(uid: string, plate: Plate, payload: PlateInput, role: UserRole = "user") {
  const sanitizedPayload = sanitizePlatePayload(payload);

  if (plate.source === "global") {
    await updateDoc(doc(db, "globalPlates", plate.id), {
      ...sanitizedPayload,
      visibility: "public",
      status: role === "admin" ? "approved" : "pending",
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await updateDoc(doc(platesCollection(uid), plate.id), {
    ...sanitizedPayload,
    visibility: "private",
    status: "approved",
    updatedAt: serverTimestamp(),
  });
}

export async function deletePlate(uid: string, plate: Plate) {
  if (plate.source === "global") {
    await deleteDoc(doc(db, "globalPlates", plate.id));
    return;
  }

  await deleteDoc(doc(platesCollection(uid), plate.id));
}

export async function approveGlobalPlate(plateId: string) {
  await updateDoc(doc(db, "globalPlates", plateId), {
    status: "approved",
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function rejectGlobalPlate(plateId: string) {
  await updateDoc(doc(db, "globalPlates", plateId), {
    status: "rejected",
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

function hydratePlate(plate: Plate, source: "private" | "global", ownerUid?: string): Plate {
  return {
    ...plate,
    source,
    visibility: source === "global" ? "public" : "private",
    status: plate.status ?? "approved",
    ownerUid: plate.ownerUid ?? ownerUid ?? null,
    fluidMilliliters: plate.fluidMilliliters ?? 0,
  };
}

function sanitizePlatePayload(payload: PlateInput): PlateInput {
  return {
    name: payload.name.trim(),
    ingredients: payload.ingredients.map((ingredient) => ({
      ...ingredient,
      foodSource: ingredient.foodSource ?? "private",
      fluidMilliliters: ingredient.fluidMilliliters ?? 0,
    })),
    totalGrams: Number(payload.totalGrams) || 0,
    calories: Number(payload.calories) || 0,
    protein: Number(payload.protein) || 0,
    fat: Number(payload.fat) || 0,
    carbs: Number(payload.carbs) || 0,
    fluidMilliliters: Number(payload.fluidMilliliters) || 0,
    visibility: payload.visibility ?? "private",
  };
}
