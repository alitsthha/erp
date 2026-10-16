import { useSessionState } from "@/hooks/useSessionState";
import { useLocation } from "react-router-dom";
import { useMemo, type ReactNode } from "react";
import { ListSortContext } from "./list-sort-context";
import type { ListSortOrder } from "@/utils/list-sort";

export default function ListSortProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [order, setOrder] = useSessionState<ListSortOrder>(`${pathname}:sort`, "default");
  const value = useMemo(() => ({ order, setOrder }), [order, setOrder]);
  return <ListSortContext.Provider value={value}>{children}</ListSortContext.Provider>;
}
