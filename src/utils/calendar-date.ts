import NepaliDate from "nepali-date-converter";
import { convertADToBS, convertBSToAD } from "./nepali-date";

export function isValidBSDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  try {
    const date = new NepaliDate(year, month - 1, day);
    return date.getYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  } catch { return false; }
}

export function getKathmanduToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((value) => value.type === type)!.value;
  const ad = `${part("year")}-${part("month")}-${part("day")}`;
  return { ad, bs: convertADToBS(ad) };
}

export function getBSMonth(month: string) {
  const first = `${month}-01`;
  if (!isValidBSDate(first)) throw new Error("Unsupported Nepali calendar month.");
  const [year, monthNumber] = month.split("-").map(Number);
  const firstWeekday = new NepaliDate(year, monthNumber - 1, 1).getDay();
  const days = Array.from({ length: 32 }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`)
    .filter(isValidBSDate)
    .map((bs) => ({ bs, ad: convertBSToAD(bs), day: Number(bs.slice(-2)) }));
  return { first, last: days.at(-1)!.bs, firstWeekday, days };
}

export function shiftBSMonth(month: string, amount: number): string {
  const [year, number] = month.split("-").map(Number);
  const index = year * 12 + number - 1 + amount;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

export function getBSCalendarGrid(month: string) {
  const calendar = getBSMonth(month);
  const [year, adMonth, day] = calendar.days[0].ad.split("-").map(Number);
  const length = Math.ceil((calendar.firstWeekday + calendar.days.length) / 7) * 7;
  const cells = Array.from({ length }, (_, index) => {
    // Use civil dates at noon to avoid midnight/DST rollover when generating adjacent days.
    const date = new Date(year, adMonth - 1, day + index - calendar.firstWeekday, 12);
    try {
      const bs = new NepaliDate(date);
      const dateBS = `${bs.getYear()}-${String(bs.getMonth() + 1).padStart(2, "0")}-${String(bs.getDate()).padStart(2, "0")}`;
      return { bs: dateBS, ad: convertBSToAD(dateBS), day: bs.getDate(), inMonth: dateBS.slice(0, 7) === month };
    } catch { return null; } // The converter's first/last supported month can have unavailable neighbors.
  });
  return { ...calendar, cells, rangeStart: cells.find((cell) => cell)?.bs || calendar.first,
    rangeEnd: cells.findLast((cell) => cell)?.bs || calendar.last };
}

export function formatADMonthRange(first: string, last: string) {
  const format = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
  const start = format(first);
  const end = format(last);
  const firstYear = first.slice(0, 4);
  const lastYear = last.slice(0, 4);
  if (firstYear !== lastYear) return `${start} ${firstYear} / ${end} ${lastYear}`;
  return `${start === end ? start : `${start}/${end}`} ${lastYear}`;
}

// Legacy enrollment dates may be AD; current enrollment forms store BS.
export function normalizeEnrollmentDate(value: string): string | null {
  const date = value?.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (Number(date.slice(0, 4)) >= 2070) return isValidBSDate(date) ? date : null;
  const converted = convertADToBS(date);
  return isValidBSDate(converted) && convertBSToAD(converted) === date ? converted : null;
}
