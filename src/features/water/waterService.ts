import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { WaterGlass, WaterGlassInput, WaterLog } from "../../types";
import { getTodayDateKey } from "../../utils/date";
import { foodsCollection } from "../foods/foodService";
import { foodLogsCollection } from "../logs/logService";

export function globalWaterGlassesCollection() {
  return collection(db, "globalWaterGlasses");
}

export function hiddenGlobalWaterGlassesCollection(uid: string) {
  return collection(db, "users", uid, "hiddenGlobalWaterGlasses");
}

export function subscribeWaterGlasses(uid: string, onNext: (glasses: WaterGlass[]) => void, onError: () => void) {
  let privateGlasses: WaterGlass[] = [];
  let globalGlasses: WaterGlass[] = [];
  let hiddenGlobalGlassIds = new Set<string>();
  let privateReady = false;
  let globalReady = false;
  let hiddenReady = false;

  const emit = () => {
    if (!privateReady || !globalReady || !hiddenReady) return;
    const overriddenGlobalGlassIds = new Set(
      privateGlasses
        .map((glass) => glass.originalGlobalGlassId)
        .filter((glassId): glassId is string => Boolean(glassId)),
    );
    const visibleGlobalGlasses = globalGlasses.filter(
      (glass) => !hiddenGlobalGlassIds.has(glass.id) && !overriddenGlobalGlassIds.has(glass.id),
    );

    onNext([...visibleGlobalGlasses, ...privateGlasses].sort((a, b) => a.milliliters - b.milliliters));
  };

  const unsubscribePrivate = onSnapshot(
    query(foodsCollection(uid), orderBy("name", "asc")),
    (snapshot) => {
      privateGlasses = snapshot.docs
        .map((item) => hydrateWaterGlass({ id: item.id, ...item.data() } as WaterGlass, "private", uid))
        .filter((glass) => glass.entryType === "waterGlass");
      privateReady = true;
      emit();
    },
    onError,
  );

  const unsubscribeGlobal = onSnapshot(
    query(globalWaterGlassesCollection(), where("status", "==", "approved")),
    (snapshot) => {
      globalGlasses = snapshot.docs.map((item) => hydrateWaterGlass({ id: item.id, ...item.data() } as WaterGlass, "global"));
      globalReady = true;
      emit();
    },
    onError,
  );

  const unsubscribeHidden = onSnapshot(
    hiddenGlobalWaterGlassesCollection(uid),
    (snapshot) => {
      hiddenGlobalGlassIds = new Set(snapshot.docs.map((item) => item.id));
      hiddenReady = true;
      emit();
    },
    onError,
  );

  return () => {
    unsubscribePrivate();
    unsubscribeGlobal();
    unsubscribeHidden();
  };
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
    visibility: "private",
    status: "approved",
    ownerUid: uid,
    createdByRole: "user",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateWaterGlass(uid: string, glass: WaterGlass, payload: WaterGlassInput, scope: "personal" | "global" = "personal") {
  if (glass.source === "global" && scope === "global") {
    await updateDoc(doc(db, "globalWaterGlasses", glass.id), {
      ...payload,
      size: payload.size ?? "medium",
      entryType: "waterGlass",
      visibility: "public",
      status: "approved",
      updatedAt: serverTimestamp(),
    });
    return;
  }

  if (glass.source === "global") {
    await Promise.all([
      setDoc(doc(foodsCollection(uid), getPersonalWaterGlassOverrideId(glass.id)), {
        ...payload,
        size: payload.size ?? "medium",
        entryType: "waterGlass",
        visibility: "private",
        status: "approved",
        ownerUid: uid,
        createdByRole: "user",
        originalGlobalGlassId: glass.id,
        updatedAt: serverTimestamp(),
      }),
      hideGlobalWaterGlassForUser(uid, glass.id),
    ]);
    return;
  }

  await updateDoc(doc(db, "users", uid, "foods", glass.id), {
    ...payload,
    size: payload.size ?? "medium",
    entryType: "waterGlass",
    visibility: "private",
    status: "approved",
    updatedAt: serverTimestamp(),
  });
}

export async function deleteWaterGlass(uid: string, glass: WaterGlass, scope: "personal" | "global" = "personal") {
  if (glass.source === "global" && scope === "global") {
    await deleteDoc(doc(db, "globalWaterGlasses", glass.id));
    return;
  }

  if (glass.source === "global") {
    await hideGlobalWaterGlassForUser(uid, glass.id);
    return;
  }

  await deleteDoc(doc(db, "users", uid, "foods", glass.id));
}

export async function createWaterLog(uid: string, glass: WaterGlass, dateKey = getTodayDateKey()) {
  await addDoc(foodLogsCollection(uid), {
    entryType: "water",
    dateKey,
    consumedAt: Timestamp.now(),
    glassId: glass.id,
    glassSource: glass.source ?? "private",
    glassNameSnapshot: glass.name,
    milliliters: glass.milliliters,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteWaterLog(uid: string, logId: string) {
  await deleteDoc(doc(db, "users", uid, "foodLogs", logId));
}

function hydrateWaterGlass(glass: WaterGlass, source: "private" | "global", ownerUid?: string): WaterGlass {
  return {
    ...glass,
    size: glass.size ?? "medium",
    source,
    visibility: source === "global" ? "public" : "private",
    status: glass.status ?? "approved",
    ownerUid: glass.ownerUid ?? ownerUid ?? null,
  };
}

async function hideGlobalWaterGlassForUser(uid: string, glassId: string) {
  await setDoc(doc(db, "users", uid, "hiddenGlobalWaterGlasses", glassId), {
    glassId,
    hiddenAt: serverTimestamp(),
  });
}

function getPersonalWaterGlassOverrideId(glassId: string) {
  return `global-water-${glassId}`;
}
