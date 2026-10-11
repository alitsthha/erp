export function formatPersonName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase().replace(
    /(^|\s)(\p{L})/gu,
    (_, space: string, letter: string) => space + letter.toUpperCase()
  );
}
