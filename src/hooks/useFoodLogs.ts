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
      setLoading(false);
      return;
    }

    setLoading(true);
    return subscribeFoodLogsByDate(
      user.uid,
      dateKey,
      (nextLogs) => {
        setLogs(nextLogs);
        setError(null);
        setLoading(false);
      },
      () => {
        setError("Günlük kayıtlar alınamadı.");
        setLoading(false);
      },
    );
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
      setLoading(false);
      return;
    }

    setLoading(true);
    return subscribeFoodLogsFromDate(
      user.uid,
      startDateKey,
      (nextLogs) => {
        setLogs(nextLogs);
        setError(null);
        setLoading(false);
      },
      () => {
        setError("Özet kayıtları alınamadı.");
        setLoading(false);
      },
    );
  }, [startDateKey, user]);

  return { logs, loading, error };
}
