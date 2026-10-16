import { useContext, useEffect, useId, useRef } from "react";
import { FormSafetyContext } from "@/components/forms/form-safety-context";

// For editors that do not use a native form (billing and bulk actions).
export function useUnsavedWork(dirty: boolean) {
  const entries = useContext(FormSafetyContext);
  const id = useId();
  const entry = useRef({ dirty, saving: false });
  useEffect(() => { entry.current.dirty = dirty; }, [dirty]);
  useEffect(() => {
    entries?.set(id, entry.current);
    return () => { entries?.delete(id); };
  }, [entries, id]);
}
