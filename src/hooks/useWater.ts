import { useEffect, useState } from "react";
import { useAuth } from "../features/auth/AuthContext";
import { subscribeWaterGlasses, subscribeWaterLogsByDate } from "../features/water/waterService";
import type { WaterGlass, WaterLog } from "../types";

export function useWaterGlasses() {
  const { user } = useAuth();
  const [glasses, setGlasses] = useState<WaterGlass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setGlasses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    return subscribeWaterGlasses(
      user.uid,
      (nextGlasses) => {
        setGlasses(nextGlasses);
        setError(null);
        setLoading(false);
      },
      () => {
        setError("Bardaklar alınamadı.");
        setLoading(false);
      },
    );
  }, [user]);

  return { glasses, loading, error };
}

export function useWaterLogsByDate(dateKey: string) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<WaterLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    return subscribeWaterLogsByDate(
      user.uid,
      dateKey,
      (nextLogs) => {
        setLogs(nextLogs);
        setError(null);
        setLoading(false);
      },
      () => {
        setError("Su kayıtları alınamadı.");
        setLoading(false);
      },
    );
  }, [dateKey, user]);

  return { logs, loading, error };
}
