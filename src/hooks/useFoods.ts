import { useEffect, useState } from "react";
import type { Food } from "../types";
import { subscribeFoods } from "../features/foods/foodService";
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
      setError("Yemekler zamanında alınamadı. Sayfayı yenileyip tekrar deneyebilirsin.");
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
        setError("Yemekler alınamadı.");
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
