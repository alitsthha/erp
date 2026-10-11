export const ACTIVITY_PALETTE = [
  "#2563EB", "#DC2626", "#059669", "#9333EA", "#EA580C", "#0891B2",
  "#DB2777", "#CA8A04", "#4F46E5", "#0D9488", "#7C3AED", "#65A30D",
  "#BE123C", "#0369A1", "#A16207", "#475569",
];

export function normalizeActivityColor(value: unknown): string | null {
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value.trim())) return null;
  return value.trim().toUpperCase();
}

export function nextActivityColor(values: Iterable<string>): string {
  const used = new Set([...values].map(normalizeActivityColor));
  for (const color of ACTIVITY_PALETTE) if (!used.has(color)) return color;
  // Walk the RGB space with an odd multiplier; this cannot repeat before all colors are visited.
  for (let index = 1; index <= 0x1000000; index++) {
    const color = `#${((index * 0x9e3779) & 0xffffff).toString(16).padStart(6, "0").toUpperCase()}`;
    if (!used.has(color)) return color;
  }
  throw new Error("No unused activity colors remain.");
}

export interface ActivityColor { color: string; activityName: string; activityCode: string }
export type ActivityColors = Record<string, ActivityColor>;
