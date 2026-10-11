export const PAGE_SIZE = 10;

export function getPage<T>(items: readonly T[], requestedPage: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const page = Math.min(totalPages, Math.max(1, Math.floor(requestedPage) || 1));
  const offset = (page - 1) * PAGE_SIZE;
  return { page, totalPages, offset, items: items.slice(offset, offset + PAGE_SIZE) };
}
