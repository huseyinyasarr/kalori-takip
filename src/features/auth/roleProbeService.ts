import { FirebaseError } from "firebase/app";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { UserRole } from "../../types";

export async function resolveRulesRole(): Promise<UserRole> {
  if (await canReadRoleProbe("admin")) return "admin";
  if (await canReadRoleProbe("editor")) return "editor";
  return "user";
}

async function canReadRoleProbe(role: "admin" | "editor") {
  try {
    await getDoc(doc(db, "roleProbes", role));
    return true;
  } catch (error) {
    if (error instanceof FirebaseError && error.code === "permission-denied") {
      return false;
    }

    console.error("Role probe could not be checked.", error);
    return false;
  }
}
