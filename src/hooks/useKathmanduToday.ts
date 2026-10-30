import { useEffect, useState } from "react";
import { getKathmanduToday } from "@/utils/calendar-date";

export function useKathmanduToday() {
  const [today, setToday] = useState(() => getKathmanduToday().bs);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      const now = new Date();
      const date = getKathmanduToday(now);
      setToday(date.bs);
      // Nepal has a fixed UTC+05:45 offset. Refresh at the next local midnight.
      const nextMidnight = Date.parse(`${date.ad}T00:00:00+05:45`) + 86_400_000;
      clearTimeout(timer);
      timer = setTimeout(refresh, Math.max(1, nextMidnight - now.getTime()));
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return today;
}
