import {
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { WaterGlass, WaterGlassInput, WaterLog } from "../../types";
import { getTodayDateKey } from "../../utils/date";
import { foodsCollection } from "../foods/foodService";
import { foodLogsCollection } from "../logs/logService";

export function subscribeWaterGlasses(uid: string, onNext: (glasses: WaterGlass[]) => void, onError: () => void) {
  return onSnapshot(
    query(foodsCollection(uid), orderBy("name", "asc")),
    (snapshot) => {
      const glasses = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }) as WaterGlass)
        .filter((glass) => glass.entryType === "waterGlass")
        .sort((a, b) => a.milliliters - b.milliliters);
      onNext(glasses);
    },
    onError,
  );
}

export function subscribeWaterLogsByDate(
  uid: string,
  dateKey: string,
  onNext: (logs: WaterLog[]) => void,
  onError: () => void,
) {
  return onSnapshot(
    query(foodLogsCollection(uid), where("dateKey", "==", dateKey)),
    (snapshot) => {
      const logs = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }) as WaterLog)
        .filter((log) => log.entryType === "water")
        .sort((a, b) => b.consumedAt.toMillis() - a.consumedAt.toMillis());
      onNext(logs);
    },
    onError,
  );
}

export function subscribeWaterLogsFromDate(
  uid: string,
  startDateKey: string,
  onNext: (logs: WaterLog[]) => void,
  onError: () => void,
) {
  return onSnapshot(
    query(foodLogsCollection(uid), where("dateKey", ">=", startDateKey), orderBy("dateKey", "asc")),
    (snapshot) => {
      onNext(
        snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }) as WaterLog)
          .filter((log) => log.entryType === "water"),
      );
    },
    onError,
  );
}

export async function createWaterGlass(uid: string, payload: WaterGlassInput) {
  await addDoc(foodsCollection(uid), {
    ...payload,
    size: payload.size ?? "medium",
    entryType: "waterGlass",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateWaterGlass(uid: string, glassId: string, payload: WaterGlassInput) {
  await updateDoc(doc(db, "users", uid, "foods", glassId), {
    ...payload,
    size: payload.size ?? "medium",
    entryType: "waterGlass",
    updatedAt: serverTimestamp(),
  });
}

export async function deleteWaterGlass(uid: string, glassId: string) {
  await deleteDoc(doc(db, "users", uid, "foods", glassId));
}

export async function createWaterLog(uid: string, glass: WaterGlass, dateKey = getTodayDateKey()) {
  await addDoc(foodLogsCollection(uid), {
    entryType: "water",
    dateKey,
    consumedAt: Timestamp.now(),
    glassId: glass.id,
    glassNameSnapshot: glass.name,
    milliliters: glass.milliliters,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteWaterLog(uid: string, logId: string) {
  await deleteDoc(doc(db, "users", uid, "foodLogs", logId));
}
