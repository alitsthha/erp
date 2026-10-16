import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useBlocker } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { FormSafetyContext, type FormSafetyEntry } from "./form-safety-context";

export default function FormSafetyProvider({ children }: { children: ReactNode }) {
  const [entries] = useState(() => new Map<string, FormSafetyEntry>());
  const { user } = useAuth();
  const shouldBlock = useCallback(() => Boolean(user) && [...entries.values()].some((entry) => entry.dirty && !entry.saving), [user, entries]);
  const blocker = useBlocker(shouldBlock);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if ([...entries.values()].some((entry) => entry.dirty || entry.saving)) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [entries]);
  return <FormSafetyContext.Provider value={entries}>
    {children}
    <ConfirmDialog open={blocker.state === "blocked"} title="Leave unsaved changes?" description="Your changes have not been saved. Stay on this page to finish saving, or leave and discard them." confirmLabel="Leave page" onCancel={() => { if (blocker.state === "blocked") blocker.reset(); }} onConfirm={() => { if (blocker.state === "blocked") blocker.proceed(); }} />
  </FormSafetyContext.Provider>;
}
