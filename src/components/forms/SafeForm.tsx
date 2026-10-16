import { useContext, useEffect, useId, useRef, useState, type ComponentProps, type FormEvent } from "react";
import { FormSafetyContext } from "./form-safety-context";

type Props = Omit<ComponentProps<"form">, "onSubmit"> & {
  onSubmit?: (event: FormEvent<HTMLFormElement>) => unknown;
  saved?: unknown;
  dirty?: boolean;
};

// Shared protection for forms, including handlers that navigate after saving.
export default function SafeForm({ onSubmit, children, saved, dirty, onChangeCapture, onInputCapture, onClickCapture, ...props }: Props) {
  const entries = useContext(FormSafetyContext);
  const id = useId();
  const entry = useRef({ dirty: false, saving: false });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    entries?.set(id, entry.current);
    return () => { entries?.delete(id); };
  }, [entries, id]);
  useEffect(() => { if (dirty !== undefined) entry.current.dirty = dirty; }, [dirty]);
  useEffect(() => { if (saved) entry.current.dirty = false; }, [saved]);
  const markDirty = () => { if (dirty === undefined) entry.current.dirty = true; setError(""); };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (entry.current.saving) return;
    entry.current.saving = true;
    setPending(true);
    setError("");
    try {
      const result = await onSubmit?.(event);
      if (result === true) entry.current.dirty = false;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save. Your entries are still here; please try again.");
    } finally {
      entry.current.saving = false;
      setPending(false);
    }
  };
  return <form {...props} onSubmit={submit} aria-busy={pending}
    onChangeCapture={(event) => { markDirty(); onChangeCapture?.(event); }}
    onInputCapture={(event) => { markDirty(); onInputCapture?.(event); }}
    onReset={() => { entry.current.dirty = false; }}
    onClickCapture={(event) => {
      const target = (event.target as HTMLElement).closest("button");
      if (target && /^(mark all|clear attendance|auto.select|pay full)/i.test(target.textContent?.trim() ?? "")) markDirty();
      if (target && target.type === "button" && /^cancel$/i.test(target.textContent?.trim() ?? "") && entry.current.dirty) {
        if (!window.confirm("Discard your unsaved changes?")) { event.preventDefault(); event.stopPropagation(); return; }
        entry.current.dirty = false;
      }
      onClickCapture?.(event);
    }}>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <fieldset disabled={pending} className="contents">{children}</fieldset>
    {pending && <p role="status" className="text-sm text-slate-500">Saving… Please wait.</p>}
  </form>;
}
