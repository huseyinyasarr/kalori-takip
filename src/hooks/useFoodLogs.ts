import { useEffect, useState } from "react";
import { useAuth } from "../features/auth/AuthContext";
import { subscribeFoodLogsByDate, subscribeFoodLogsFromDate } from "../features/logs/logService";
import type { FoodLog } from "../types";

export function useFoodLogsByDate(dateKey: string) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<FoodLog[]>([]);
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
      setError("Günlük kayıtlar zamanında alınamadı. Sayfayı yenileyip tekrar deneyebilirsin.");
      setLoading(false);
    }, 15000);

    const unsubscribe = subscribeFoodLogsByDate(
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
        setError("Günlük kayıtlar alınamadı.");
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

export function useFoodLogsFromDate(startDateKey: string) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<FoodLog[]>([]);
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
      setError("Özet kayıtları zamanında alınamadı. Sayfayı yenileyip tekrar deneyebilirsin.");
      setLoading(false);
    }, 15000);

    const unsubscribe = subscribeFoodLogsFromDate(
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
        setError("Özet kayıtları alınamadı.");
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
