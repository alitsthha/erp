import { ArrowUpDown } from "lucide-react";
import { useContext } from "react";
import { ListSortContext } from "./list-sort-context";
import type { ListSortOrder } from "@/utils/list-sort";

interface Props {
  value?: ListSortOrder;
  onChange?: (value: ListSortOrder) => void;
  allowDate?: boolean;
}

export default function ListSortControl({ value, onChange, allowDate = true }: Props) {
  const context = useContext(ListSortContext);
  return <label className="relative block w-full shrink-0 sm:w-52">
    <span className="sr-only">Sort records</span>
    <ArrowUpDown size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
    <select aria-label="Sort records" value={value ?? context?.order ?? "default"} onChange={(event) => (onChange ?? context?.setOrder)?.(event.target.value as ListSortOrder)} className="ui-field w-full pl-9 pr-7 text-slate-700 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100">
      <option value="default">Default order</option>
      <option value="name-asc">Name: A–Z</option>
      <option value="name-desc">Name: Z–A</option>
      <option value="date-asc" disabled={!allowDate}>Date: Oldest first</option>
      <option value="date-desc" disabled={!allowDate}>Date: Newest first</option>
    </select>
  </label>;
}
