import { doc, onSnapshot } from "firebase/firestore";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { db } from "../../lib/firebase";
import type { UserProfile } from "../../types";
import { useAuth } from "../auth/AuthContext";

interface ProfileContextValue {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const timeoutId = window.setTimeout(() => {
      setError("Profil bilgileri zamanında alınamadı. Sayfayı yenileyip tekrar deneyebilirsin.");
      setLoading(false);
    }, 15000);

    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid),
      (snapshot) => {
        window.clearTimeout(timeoutId);
        setProfile(snapshot.exists() ? (snapshot.data() as UserProfile) : null);
        setError(null);
        setLoading(false);
      },
      () => {
        window.clearTimeout(timeoutId);
        setError("Profil bilgileri alınamadı.");
        setLoading(false);
      },
    );

    return () => {
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [authLoading, user]);

  const value = useMemo(() => ({ profile, loading: authLoading || loading, error }), [authLoading, error, loading, profile]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error("useProfile must be used inside ProfileProvider");
  return context;
}
