import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "../../lib/firebase";
import type { UserProfile, WeightLogSource } from "../../types";
import { calculateTargets } from "../../utils/calculations";
import { getTodayDateKey } from "../../utils/date";

export function userDocRef(uid: string) {
  return doc(db, "users", uid);
}

export async function getUserProfile(uid: string) {
  const snapshot = await getDoc(userDocRef(uid));
  return snapshot.exists() ? (snapshot.data() as UserProfile) : null;
}

export async function ensureUserDocument(user: User) {
  const ref = userDocRef(user.uid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email,
      photoURL: user.photoURL,
      googleDisplayName: user.displayName,
      fullName: user.displayName ?? "",
      currentWeight: 0,
      targetWeight: 0,
      averageBurnKcal: 0,
      dailyCalorieTarget: 0,
      proteinTargetGram: 0,
      minFatTargetGram: 0,
      minCarbTargetGram: 0,
      onboardingCompleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

export async function completeOnboarding(
  user: User,
  payload: { fullName: string; currentWeight: number; targetWeight: number },
) {
  const targets = calculateTargets(payload.currentWeight, payload.targetWeight);
  const today = getTodayDateKey();

  await setDoc(
    userDocRef(user.uid),
    {
      uid: user.uid,
      email: user.email,
      photoURL: user.photoURL,
      googleDisplayName: user.displayName,
      fullName: payload.fullName,
      currentWeight: payload.currentWeight,
      targetWeight: payload.targetWeight,
      ...targets,
      onboardingCompleted: true,
      lastWeightPromptDateKey: today,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await writeWeightLog(user.uid, today, payload.currentWeight, "measured");
}

export async function updateProfileTargets(
  uid: string,
  payload: { fullName?: string; currentWeight: number; targetWeight: number },
  writeManualWeightLog = false,
) {
  const targets = calculateTargets(payload.currentWeight, payload.targetWeight);

  await updateDoc(userDocRef(uid), {
    ...payload,
    ...targets,
    updatedAt: serverTimestamp(),
  });

  if (writeManualWeightLog) {
    await writeWeightLog(uid, getTodayDateKey(), payload.currentWeight, "manual");
  }
}

export async function markWeightPromptSkipped(uid: string) {
  const today = getTodayDateKey();
  await updateDoc(userDocRef(uid), {
    lastWeightPromptDateKey: today,
    updatedAt: serverTimestamp(),
  });
  await writeWeightLog(uid, today, null, "skipped");
}

export async function submitDailyWeight(uid: string, currentWeight: number, targetWeight: number) {
  const today = getTodayDateKey();
  const targets = calculateTargets(currentWeight, targetWeight);

  await updateDoc(userDocRef(uid), {
    currentWeight,
    ...targets,
    lastWeightPromptDateKey: today,
    updatedAt: serverTimestamp(),
  });
  await writeWeightLog(uid, today, currentWeight, "measured");
}

export async function writeWeightLog(
  uid: string,
  dateKey: string,
  weight: number | null,
  source: WeightLogSource,
) {
  const ref = doc(collection(db, "users", uid, "weightLogs"), dateKey);
  await setDoc(
    ref,
    {
      dateKey,
      weight,
      source,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function deleteUserProfile(uid: string) {
  await deleteDoc(userDocRef(uid));
}
