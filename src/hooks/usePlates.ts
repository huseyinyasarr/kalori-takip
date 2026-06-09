import { useEffect, useState } from "react";
import { useAuth } from "../features/auth/AuthContext";
import { subscribePendingGlobalPlates, subscribePlates, subscribeUserGlobalPlates } from "../features/plates/plateService";
import type { Plate } from "../types";

export function usePlates() {
  const { user } = useAuth();
  const [plates, setPlates] = useState<Plate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setPlates([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const timeoutId = window.setTimeout(() => {
      setError("Tabaklar zamanında alınamadı. Sayfayı yenileyip tekrar deneyebilirsin.");
      setLoading(false);
    }, 15000);

    const unsubscribe = subscribePlates(
      user.uid,
      (nextPlates) => {
        window.clearTimeout(timeoutId);
        setPlates(nextPlates);
        setError(null);
        setLoading(false);
      },
      () => {
        window.clearTimeout(timeoutId);
        setError("Tabaklar alınamadı.");
        setLoading(false);
      },
    );

    return () => {
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [user]);

  return { plates, loading, error };
}

export function useMyGlobalPlates() {
  const { user, isEditor } = useAuth();
  const [plates, setPlates] = useState<Plate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isEditor) {
      setPlates([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const unsubscribe = subscribeUserGlobalPlates(
      user.uid,
      (nextPlates) => {
        setPlates(nextPlates);
        setError(null);
        setLoading(false);
      },
      () => {
        setError("Global tabak önerileri alınamadı.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [isEditor, user]);

  return { plates, loading, error };
}

export function usePendingGlobalPlates() {
  const { isAdmin } = useAuth();
  const [plates, setPlates] = useState<Plate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setPlates([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const unsubscribe = subscribePendingGlobalPlates(
      (nextPlates) => {
        setPlates(nextPlates);
        setError(null);
        setLoading(false);
      },
      () => {
        setError("Onay bekleyen tabaklar alınamadı.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [isAdmin]);

  return { plates, loading, error };
}
