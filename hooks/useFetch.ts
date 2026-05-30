"use client";
import { useState, useEffect, useRef } from "react";

export function useFetch<T>(
  fetcher: () => Promise<T>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deps: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Stable ref so we can safely ignore stale requests
  const cancelRef = useRef(false);

  useEffect(() => {
    cancelRef.current = false;
    setLoading(true);
    setError(null);

    fetcher()
      .then((result) => {
        if (!cancelRef.current) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelRef.current) {
          setError(err?.message ?? "Erreur de chargement");
          setLoading(false);
        }
      });

    return () => {
      cancelRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, reload: () => setLoading(true) };
}
