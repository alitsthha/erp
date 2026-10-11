import { createContext } from "react";
import type { ListSortOrder } from "@/utils/list-sort";

export const ListSortContext = createContext<{
  order: ListSortOrder;
  setOrder: (order: ListSortOrder) => void;
} | null>(null);
