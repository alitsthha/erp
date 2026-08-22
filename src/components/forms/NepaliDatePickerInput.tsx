import { NepaliDatePicker } from "nepali-datepicker-reactjs";
import "nepali-datepicker-reactjs/dist/index.css";

type NepaliDatePickerInputProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  className?: string;
  helperText?: string;
};

export default function NepaliDatePickerInput({
  label,
  value,
  onChange,
  required,
  error,
  className = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
  helperText,
}: NepaliDatePickerInputProps) {
  return (
    <div>
      {label && <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}{required && <span className="text-red-500"> *</span>}</label>}
      <NepaliDatePicker
        inputClassName={className}
        className="w-full"
        value={value}
        onChange={onChange}
        options={{ calenderLocale: "en", valueLocale: "en" }}
        todayIfEmpty={!required}
      />
      {helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
      {error && <p className="mt-1 text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
}
