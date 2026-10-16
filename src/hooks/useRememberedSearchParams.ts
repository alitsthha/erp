import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export function useRememberedSearchParams(key: string) {
  const storageKey = `erp:ui:${key}:query`;
  const [defaults] = useState(() => {
    try { return new URLSearchParams(sessionStorage.getItem(storageKey) ?? ""); }
    catch { return new URLSearchParams(); }
  });
  const [params, setParams] = useSearchParams(defaults);
  useEffect(() => {
    try { sessionStorage.setItem(storageKey, params.toString()); } catch { /* Optional preference. */ }
  }, [params, storageKey]);
  return [params, setParams] as const;
}
