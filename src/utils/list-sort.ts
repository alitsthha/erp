import NepaliDate from "nepali-date-converter";

export type ListSortOrder = "default" | "name-asc" | "name-desc" | "date-asc" | "date-desc";

const nameFields = ["fullName", "studentName", "staffName", "accountName", "activityName", "name", "title", "role", "description", "source", "invoiceNumber", "entryNumber", "period"];
const dateFields = ["sessionDateBS", "sessionDate", "enrollmentDate", "joiningDateBS", "joiningDate", "invoiceDate", "paymentDate", "expenseDate", "incomeDate", "entryDate", "transactionDate", "dateBS", "date", "startDate", "period", "createdAt", "updatedAt"];
const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

export function getSortName(value: unknown): string {
  const record = asRecord(value);
  // Aging reports wrap the invoice rather than copying its fields.
  if (record.invoice) return getSortName(record.invoice);
  for (const field of nameFields) {
    const name = record[field];
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  return typeof value === "string" ? value.trim() : "";
}

export function dateSortValue(value: unknown, calendar: "BS" | "auto" = "auto"): number | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (typeof value === "object") {
    const timestamp = value as { toMillis?: () => number; seconds?: number; nanoseconds?: number };
    if (typeof timestamp.toMillis === "function") {
      const result = timestamp.toMillis();
      return Number.isFinite(result) ? result : null;
    }
    if (typeof timestamp.seconds === "number") {
      const result = timestamp.seconds * 1000 + (timestamp.nanoseconds ?? 0) / 1e6;
      return Number.isFinite(result) ? result : null;
    }
    return null;
  }
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(value.trim());
  if (match) {
    let year = Number(match[1]);
    let month = Number(match[2]);
    let day = Number(match[3] ?? 1);
    // Legacy date-only fields contain both AD and BS; current BS records use 20xx BS years.
    if (calendar === "BS" || year >= 2070) {
      try {
        const bs = new NepaliDate(year, month - 1, day);
        if (bs.getYear() !== year || bs.getMonth() !== month - 1 || bs.getDate() !== day) return null;
        const ad = bs.toJsDate();
        year = ad.getFullYear(); month = ad.getMonth() + 1; day = ad.getDate();
      } catch { return null; }
    }
    const result = new Date(Date.UTC(year, month - 1, day));
    return result.getUTCFullYear() === year && result.getUTCMonth() === month - 1 && result.getUTCDate() === day ? result.getTime() : null;
  }
  // Only parse ISO timestamps; never interpret locale-dependent display dates.
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) return null;
  const result = Date.parse(value);
  return Number.isFinite(result) ? result : null;
}

export function getSortDate(value: unknown): number | null {
  const record = asRecord(value);
  if (record.invoice) return getSortDate(record.invoice);
  for (const field of dateFields) {
    const date = dateSortValue(record[field], field.endsWith("BS") ? "BS" : "auto");
    if (date !== null) return date;
  }
  return null;
}

export function sortList<T>(items: readonly T[], order: ListSortOrder): T[] {
  if (order === "default") return [...items];
  const direction = order.endsWith("desc") ? -1 : 1;
  const byName = order.startsWith("name");
  return items.map((item, index) => ({ item, index, value: byName ? getSortName(item) || null : getSortDate(item) }))
    .sort((left, right) => {
      // Missing values stay last in both directions; equal values keep their original order.
      if (left.value === null) return right.value === null ? left.index - right.index : 1;
      if (right.value === null) return -1;
      const compared = byName ? collator.compare(String(left.value), String(right.value)) : Number(left.value) - Number(right.value);
      return compared * direction || left.index - right.index;
    }).map(({ item }) => item);
}
