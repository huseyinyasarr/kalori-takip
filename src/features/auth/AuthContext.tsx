import { onAuthStateChanged, type User } from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { auth, signInWithGoogle, logout } from "../../lib/firebase";
import type { UserRole } from "../../types";
import { ensureUserDocument } from "../profile/profileService";
import { resolveRulesRole } from "./roleProbeService";

interface AuthContextValue {
  user: User | null;
  role: UserRole;
  isAdmin: boolean;
  isEditor: boolean;
  loading: boolean;
  refreshClaims: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>("user");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);

      if (nextUser) {
        setRole(await resolveUserRole(nextUser));
        void ensureUserDocument(nextUser).catch((error) => {
          console.error("User document could not be initialized.", error);
        });
      } else {
        setRole("user");
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const refreshClaims = useCallback(async () => {
    if (!auth.currentUser) {
      setRole("user");
      return;
    }

    await auth.currentUser.getIdToken(true);
    setRole(await resolveUserRole(auth.currentUser));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role,
      isAdmin: role === "admin",
      isEditor: role === "admin" || role === "editor",
      loading,
      refreshClaims,
      signIn: async () => {
        const credential = await signInWithGoogle();
        setUser(credential.user);
        setRole(await resolveUserRole(credential.user));
        void ensureUserDocument(credential.user).catch((error) => {
          console.error("User document could not be initialized.", error);
        });
      },
      signOut: logout,
    }),
    [loading, refreshClaims, role, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

function normalizeRole(role: unknown): UserRole {
  if (role === "admin" || role === "editor") return role;
  return "user";
}

async function resolveUserRole(user: User): Promise<UserRole> {
  const tokenResult = await user.getIdTokenResult();
  const claimRole = normalizeRole(tokenResult.claims.role);

  if (claimRole === "admin") return "admin";

  const rulesRole = await resolveRulesRole();
  if (rulesRole === "admin") return "admin";
  if (claimRole === "editor" || rulesRole === "editor") return "editor";

  return "user";
}
