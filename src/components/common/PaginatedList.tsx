import { useContext, useId, useMemo, useState, type ReactNode } from "react";
import { getPage } from "@/utils/pagination";
import { getSortDate, sortList, type ListSortOrder } from "@/utils/list-sort";
import { ListSortContext } from "./list-sort-context";
import ListSortControl from "./ListSortControl";

interface Props<T> {
  items: readonly T[];
  children: (item: T, index: number) => ReactNode;
  table?: boolean;
  list?: boolean;
  label?: string;
  showSort?: boolean;
  sortable?: boolean;
}

export default function PaginatedList<T>({ items: sourceItems, children, table = false, list = false, label = "Records", showSort = true, sortable = true }: Props<T>) {
  const sortContext = useContext(ListSortContext);
  const [localOrder, setLocalOrder] = useState<ListSortOrder>("default");
  const order = sortable ? sortContext?.order ?? localOrder : "default";
  const items = useMemo(() => sortList(sourceItems, order), [sourceItems, order]);
  // Use identities, not array references: editing a row must not reset its page.
  const identity = order + JSON.stringify(items.map((item) => {
    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      return record.id ?? (record.studentId || record.staffId || record.enrollmentId
        ? [record.studentId, record.staffId, record.enrollmentId, record.activityId, record.sessionDate]
        : record);
    }
    return item;
  }));
  const [selection, setSelection] = useState({ identity, page: 1 });
  const pageId = useId();
  const current = getPage(items, selection.identity === identity ? selection.page : 1);
  if (selection.identity !== identity) setSelection({ identity, page: 1 });

  const changePage = (page: number) => setSelection({ identity, page });
  const pageNumbers = Array.from({ length: Math.min(5, current.totalPages) }, (_, index) =>
    Math.max(1, Math.min(current.page - 2, current.totalPages - 4)) + index
  );
  const buttonClass = "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40";
  const controls = (
    <nav aria-label={`${label} pagination`} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
      <span aria-live="polite">
        {items.length ? current.offset + 1 : 0}–{Math.min(current.offset + 10, items.length)} of {items.length} · Page {current.page} of {current.totalPages}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" className={buttonClass} disabled={current.page === 1} onClick={() => changePage(current.page - 1)}>Previous</button>
        {pageNumbers.map((page) => <button key={page} type="button" aria-label={`Page ${page}`} aria-current={page === current.page ? "page" : undefined} onClick={() => changePage(page)} className={`${buttonClass} ${page === current.page ? "border-brand-600 font-semibold text-brand-700 ring-1 ring-brand-600" : ""}`}>{page}</button>)}
        <button type="button" className={buttonClass} disabled={current.page === current.totalPages} onClick={() => changePage(current.page + 1)}>Next</button>
        {current.totalPages > 5 && <label htmlFor={pageId} className="ml-2 flex items-center gap-2">Go to
          <input id={pageId} aria-label="Go to page" type="number" min={1} max={current.totalPages} value={current.page} onChange={(event) => { const value = Number(event.target.value); if (value >= 1 && value <= current.totalPages) changePage(value); }} className="h-11 w-16 rounded border border-slate-300 px-2 py-1.5" />
        </label>}
      </div>
    </nav>
  );

  return <>
    {sortable && showSort && (() => {
      const control = <div className="flex justify-end p-3"><ListSortControl value={order} onChange={sortContext?.setOrder ?? setLocalOrder} allowDate={sourceItems.some((item) => getSortDate(item) !== null)} /></div>;
      return table ? <tr><td colSpan={99} className="p-0">{control}</td></tr>
        : list ? <li className="col-span-full list-none">{control}</li>
        : <div className="col-span-full w-full">{control}</div>;
    })()}
    {current.items.map((item, index) => children(item, current.offset + index))}
    {table ? <tr><td colSpan={99} className="p-0">{controls}</td></tr>
      : list ? <li className="col-span-full w-full list-none">{controls}</li>
      : <div className="col-span-full w-full">{controls}</div>}
  </>;
}
