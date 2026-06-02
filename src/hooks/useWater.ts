import { useEffect, useState } from "react";
import { useAuth } from "../features/auth/AuthContext";
import { subscribeWaterGlasses, subscribeWaterLogsByDate, subscribeWaterLogsFromDate } from "../features/water/waterService";
import type { WaterGlass, WaterLog } from "../types";

export function useWaterGlasses() {
  const { user } = useAuth();
  const [glasses, setGlasses] = useState<WaterGlass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setGlasses([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const timeoutId = window.setTimeout(() => {
      setError("Bardaklar zamanında alınamadı. Sayfayı yenileyip tekrar deneyebilirsin.");
      setLoading(false);
    }, 15000);

    const unsubscribe = subscribeWaterGlasses(
      user.uid,
      (nextGlasses) => {
        window.clearTimeout(timeoutId);
        setGlasses(nextGlasses);
        setError(null);
        setLoading(false);
      },
      () => {
        window.clearTimeout(timeoutId);
        setError("Bardaklar alınamadı.");
        setLoading(false);
      },
    );

    return () => {
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
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
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const timeoutId = window.setTimeout(() => {
      setError("Su kayıtları zamanında alınamadı. Sayfayı yenileyip tekrar deneyebilirsin.");
      setLoading(false);
    }, 15000);

    const unsubscribe = subscribeWaterLogsByDate(
      user.uid,
      dateKey,
      (nextLogs) => {
        window.clearTimeout(timeoutId);
        setLogs(nextLogs);
        setError(null);
        setLoading(false);
      },
      () => {
        window.clearTimeout(timeoutId);
        setError("Su kayıtları alınamadı.");
        setLoading(false);
      },
    );

    return () => {
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [dateKey, user]);

  return { logs, loading, error };
}

export function useWaterLogsFromDate(startDateKey: string) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<WaterLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLogs([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const timeoutId = window.setTimeout(() => {
      setError("Özet su kayıtları zamanında alınamadı. Sayfayı yenileyip tekrar deneyebilirsin.");
      setLoading(false);
    }, 15000);

    const unsubscribe = subscribeWaterLogsFromDate(
      user.uid,
      startDateKey,
      (nextLogs) => {
        window.clearTimeout(timeoutId);
        setLogs(nextLogs);
        setError(null);
        setLoading(false);
      },
      () => {
        window.clearTimeout(timeoutId);
        setError("Özet su kayıtları alınamadı.");
        setLoading(false);
      },
    );

    return () => {
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [startDateKey, user]);

  return { logs, loading, error };
}
