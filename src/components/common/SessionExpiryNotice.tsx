import { useEffect, useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider";

export default function SessionExpiryNotice() {
  const { sessionExpiresAt } = useAuth();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (!sessionExpiresAt) return null;
  const remaining = Math.ceil((sessionExpiresAt - now) / 1000);
  if (remaining > 120 || remaining <= 0) return null;
  return <div role="status" className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
    Your session expires in {Math.ceil(remaining / 60)} minute{remaining > 60 ? "s" : ""}. Save your work before you are signed out.
  </div>;
}
