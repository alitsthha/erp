import { useMemo, useState, type ReactNode } from "react";
import { ListSortContext } from "./list-sort-context";
import type { ListSortOrder } from "@/utils/list-sort";

export default function ListSortProvider({ children }: { children: ReactNode }) {
  const [order, setOrder] = useState<ListSortOrder>("default");
  const value = useMemo(() => ({ order, setOrder }), [order]);
  return <ListSortContext.Provider value={value}>{children}</ListSortContext.Provider>;
}
