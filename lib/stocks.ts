import { supabase } from "@/lib/supabase";

/** A row of public.stocks (PostgreSQL). */
export interface Stock {
  symbol: string;
  name: string;
  exchange: string;
  is_etf: boolean;
  revenue_usd: number | null;
  revenue_fy: number | null;
}

const COLS = "symbol,name,exchange,is_etf,revenue_usd,revenue_fy";

/** Ranked company search (ticker or name) via the search_stocks() Postgres function. */
export async function searchStocks(q: string, limit = 8): Promise<Stock[]> {
  if (!q.trim()) return [];
  const { data, error } = await supabase.rpc("search_stocks", { q, lim: limit });
  if (error) throw error;
  return (data ?? []) as Stock[];
}

export async function getStocks(symbols: string[]): Promise<Stock[]> {
  if (!symbols.length) return [];
  const { data, error } = await supabase.from("stocks").select(COLS).in("symbol", symbols);
  if (error) throw error;
  const rows = (data ?? []) as Stock[];
  return symbols.map((s) => rows.find((r) => r.symbol === s)).filter((r): r is Stock => !!r);
}

/** One row per company (share classes de-duplicated), biggest annual revenue first. */
export async function getLargestByRevenue(limit = 20): Promise<Stock[]> {
  const { data, error } = await supabase.rpc("largest_companies", { lim: limit });
  if (error) throw error;
  return (data ?? []) as Stock[];
}

/** Highest annual revenue among the given rows (ignores rows with no SEC revenue). */
export function topByRevenue(rows: Stock[]): Stock | undefined {
  return rows
    .filter((r) => r.revenue_usd)
    .sort((a, b) => Number(b.revenue_usd ?? 0) - Number(a.revenue_usd ?? 0))[0];
}

export function formatRevenue(usd: number | string | null): string {
  const v = Number(usd);
  if (!usd || !Number.isFinite(v)) return "—";
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return `$${Math.round(v).toLocaleString("en-US")}`;
}

/** Price axis label with enough precision for cheap stocks. */
export const priceAxis = (v: number) => "$" + (v < 20 ? v.toFixed(2) : v < 200 ? v.toFixed(1).replace(/\.0$/, "") : Math.round(v));

/** Popular names (as in Apple's Stocks app) for quick picks and the default watchlist. */
export const POPULAR = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "BRK.B", "WMT", "NFLX", "DIS", "KO"];
