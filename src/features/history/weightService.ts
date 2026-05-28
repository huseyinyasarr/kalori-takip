import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { WeightLog } from "../../types";

export function subscribeWeightLogsFromDate(
  uid: string,
  startDateKey: string,
  onNext: (logs: WeightLog[]) => void,
  onError: () => void,
) {
  return onSnapshot(
    query(collection(db, "users", uid, "weightLogs"), where("dateKey", ">=", startDateKey), orderBy("dateKey", "asc")),
    (snapshot) => onNext(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as WeightLog)),
    onError,
  );
}

export function subscribeWeightLogsUntilDate(
  uid: string,
  endDateKey: string,
  onNext: (logs: WeightLog[]) => void,
  onError: () => void,
) {
  return onSnapshot(
    query(collection(db, "users", uid, "weightLogs"), where("dateKey", "<=", endDateKey), orderBy("dateKey", "desc")),
    (snapshot) => onNext(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as WeightLog)),
    onError,
  );
}
