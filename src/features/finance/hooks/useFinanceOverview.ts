import { useEffect, useState } from "react";
import { subscribeFinanceOverview, type FinanceOverviewData } from "../services/finance-overview.service";

export function useFinanceOverview() {
  const [data, setData] = useState<FinanceOverviewData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => subscribeFinanceOverview(
    (value) => { setData(value); setError(""); },
    (failure) => setError(failure.message),
  ), []);
  return { data, error, loading: !data && !error };
}
