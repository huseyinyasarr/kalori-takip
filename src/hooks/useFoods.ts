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
      setLoading(false);
      return;
    }

    setLoading(true);
    return subscribeFoods(
      user.uid,
      (nextFoods) => {
        setFoods(nextFoods);
        setError(null);
        setLoading(false);
      },
      () => {
        setError("Yemekler alınamadı.");
        setLoading(false);
      },
    );
  }, [user]);

  return { foods, loading, error };
}
