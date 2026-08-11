import type { ReactNode } from "react";

type BsMonthSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  helperText?: string;
};

const MONTHS = [
  { value: "01", label: "Baishakh" },
  { value: "02", label: "Jeth" },
  { value: "03", label: "Ashadh" },
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

function splitMonth(value: string) {
  if (!value) return { year: "", month: "" };
  const [year = "", month = ""] = value.split("-");
  return { year, month };
}

function joinMonth(year: string, month: string) {
  if (!year || !month) return "";
  return `${year}-${month}`;
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

export default function BsMonthSelect({
  label,
  value,
  onChange,
  error,
  disabled,
  helperText = "Select BS year and month",
}: BsMonthSelectProps) {
  const { year, month } = splitMonth(value);

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SelectField
          value={year}
          disabled={disabled}
          onChange={(nextYear) => onChange(joinMonth(nextYear, month))}
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
          onChange={(nextMonth) => onChange(joinMonth(year, nextMonth))}
        >
          <option value="">Month</option>
          {MONTHS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
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