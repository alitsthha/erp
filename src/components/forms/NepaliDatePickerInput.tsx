import { useEffect, useId, useRef } from "react";
import NepaliDatePicker from "@zener/nepali-datepicker-react";
import "@zener/nepali-datepicker-react/index.css";

type NepaliDatePickerInputProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  helperText?: string;
};

export default function NepaliDatePickerInput({
  label,
  value,
  onChange,
  required,
  disabled,
  error,
  className = "ui-field h-11 min-w-0 w-full border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-100",
  helperText,
}: NepaliDatePickerInputProps) {
  const id = useId();
  const container = useRef<HTMLDivElement>(null);
  // The library does not expose input attributes; keep labels and validation accessible.
  useEffect(() => {
    const input = container.current?.querySelector("input");
    if (!input) return;
    input.id = id;
    input.setAttribute("aria-label", label || "Select Nepali date");
    input.setAttribute("aria-required", String(Boolean(required)));
    input.setAttribute("aria-invalid", String(Boolean(error)));
    input.setAttribute("aria-describedby", [helperText && `${id}-help`, error && `${id}-error`].filter(Boolean).join(" "));
  }, [id, label, required, error, helperText]);

  return (
    <div ref={container} className="min-w-0 w-full">
      {label && <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">{label}{required && <span className="text-red-500"> *</span>}</label>}
      <NepaliDatePicker
        type="BS"
        lang="en"
        format="YYYY-MM-DD"
        className={className}
        portalClassName="erp-bs-datepicker-menu zener-font-sans zener-mt-1"
        value={value || null}
        onChange={(date) => onChange(date?.format("YYYY-MM-DD", "en") ?? "")}
        placeholder="Select date"
        disabled={disabled}
      />
      {helperText && <p id={`${id}-help`} className="mt-1 text-xs text-slate-500">{helperText}</p>}
      {error && <p id={`${id}-error`} className="mt-1 text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
}
