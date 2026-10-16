import { useCallback, useState, type SetStateAction } from "react";

// UI preferences belong to the current login and are removed by logout cleanup.
export function useSessionState<T>(key: string, initial: T) {
  const storageKey = `erp:ui:${key}`;
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      return stored === null ? initial : JSON.parse(stored) as T;
    } catch { return initial; }
  });
  const update = useCallback((next: SetStateAction<T>) => {
    setValue((previous) => {
      const resolved = typeof next === "function" ? (next as (value: T) => T)(previous) : next;
      try { sessionStorage.setItem(storageKey, JSON.stringify(resolved)); } catch { /* Storage is optional. */ }
      return resolved;
    });
  }, [storageKey]);
  return [value, update] as const;
}
