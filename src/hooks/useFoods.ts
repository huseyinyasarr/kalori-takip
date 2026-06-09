import { useEffect, useState } from "react";
import type { Food } from "../types";
import { subscribeAllGlobalFoods, subscribeFoods, subscribePendingGlobalFoods, subscribeUserGlobalFoods } from "../features/foods/foodService";
import { useAuth } from "../features/auth/AuthContext";

export function useFoods() {
  const { user } = useAuth();
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setFoods([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const timeoutId = window.setTimeout(() => {
      setError("Besinler zamanında alınamadı. Sayfayı yenileyip tekrar deneyebilirsin.");
      setLoading(false);
    }, 15000);

    const unsubscribe = subscribeFoods(
      user.uid,
      (nextFoods) => {
        window.clearTimeout(timeoutId);
        setFoods(nextFoods);
        setError(null);
        setLoading(false);
      },
      () => {
        window.clearTimeout(timeoutId);
        setError("Besinler alınamadı.");
        setLoading(false);
      },
    );

    return () => {
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [user]);

  return { foods, loading, error };
}

export function useMyGlobalFoods() {
  const { user, isEditor } = useAuth();
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isEditor) {
      setFoods([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const unsubscribe = subscribeUserGlobalFoods(
      user.uid,
      (nextFoods) => {
        setFoods(nextFoods);
        setError(null);
        setLoading(false);
      },
      () => {
        setError("Global besin önerileri alınamadı.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [isEditor, user]);

  return { foods, loading, error };
}

export function usePendingGlobalFoods() {
  const { isAdmin } = useAuth();
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setFoods([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const unsubscribe = subscribePendingGlobalFoods(
      (nextFoods) => {
        setFoods(nextFoods);
        setError(null);
        setLoading(false);
      },
      () => {
        setError("Onay bekleyen besinler alınamadı.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [isAdmin]);

  return { foods, loading, error };
}

export function useAllGlobalFoods() {
  const { isAdmin } = useAuth();
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setFoods([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const unsubscribe = subscribeAllGlobalFoods(
      (nextFoods) => {
        setFoods(nextFoods);
        setError(null);
        setLoading(false);
      },
      () => {
        setError("Global besinler alınamadı.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [isAdmin]);

  return { foods, loading, error };
}
