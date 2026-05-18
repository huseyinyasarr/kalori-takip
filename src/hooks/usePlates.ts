import { useEffect, useState } from "react";
import { useAuth } from "../features/auth/AuthContext";
import { subscribePlates } from "../features/plates/plateService";
import type { Plate } from "../types";

export function usePlates() {
  const { user } = useAuth();
  const [plates, setPlates] = useState<Plate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setPlates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    return subscribePlates(
      user.uid,
      (nextPlates) => {
        setPlates(nextPlates);
        setError(null);
        setLoading(false);
      },
      () => {
        setError("Tabaklar alınamadı.");
        setLoading(false);
      },
    );
  }, [user]);

  return { plates, loading, error };
}
