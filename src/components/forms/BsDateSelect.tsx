import type { ReactNode } from "react";

type BsDateSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  helperText?: string;
};

const MONTHS = [
  { value: "01", label: "Baishak" },
  { value: "02", label: "Jeth" },
  { value: "03", label: "Asha" },
  { value: "04", label: "Shrawan" },
  { value: "05", label: "Bhadra" },
  { value: "06", label: "Ashwin" },
  { value: "07", label: "Kartik" },
  { value: "08", label: "Mansir" },
  { value: "09", label: "Poush" },
  { value: "10", label: "Magh" },
  { value: "11", label: "Falgun" },
  { value: "12", label: "Chaitra" },
];

const YEAR_OPTIONS = Array.from({ length: 121 }, (_, index) => 1980 + index);
const DAY_OPTIONS = Array.from({ length: 32 }, (_, index) =>
  String(index + 1).padStart(2, "0")
);

function splitDate(value: string) {
  if (!value) return { year: "", month: "", day: "" };
  const [year = "", month = "", day = ""] = value.split("-");
  return { year, month, day };
}

function joinDate(year: string, month: string, day: string) {
  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
}

function SelectField({
  value,
  onChange,
  disabled,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
    >
      {children}
    </select>
  );
}

export default function BsDateSelect({
  label,
  value,
  onChange,
  error,
  disabled,
  helperText = "Select BS year, month, and day",
}: BsDateSelectProps) {
  const { year, month, day } = splitDate(value);

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SelectField
          value={year}
          disabled={disabled}
          onChange={(nextYear) => onChange(joinDate(nextYear, month, day))}
        >
          <option value="">Year</option>
          {YEAR_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </SelectField>

        <SelectField
          value={month}
          disabled={disabled}
          onChange={(nextMonth) => onChange(joinDate(year, nextMonth, day))}
        >
          <option value="">Month</option>
          {MONTHS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>

        <SelectField
          value={day}
          disabled={disabled}
          onChange={(nextDay) => onChange(joinDate(year, month, nextDay))}
        >
          <option value="">Day</option>
          {DAY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">{helperText}</p>
        {error && <p className="text-xs font-medium text-red-500">{error}</p>}
      </div>
    </div>
  );
}