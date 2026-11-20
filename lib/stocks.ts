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

// ---------- Sample market data ----------
// No live price feed is connected; prices are deterministic samples seeded by ticker.

function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export interface Quote {
  price: number;
  change: number; // % today
  lo: number; // 52-week low
  hi: number; // 52-week high
}

export function sampleQuote(symbol: string): Quote {
  const r = rng(symbol);
  const price = Math.round((8 + r() ** 2 * 600) * 100) / 100;
  const change = Math.round((r() - 0.45) * 50) / 10;
  const lo = Math.round(price * (0.6 + r() * 0.3) * 100) / 100;
  const hi = Math.round(price * (1.02 + r() * 0.2) * 100) / 100;
  return { price, change, lo, hi };
}

/** n points walking inside the 52-week range, ending at today's price. */
export function sampleSeries(symbol: string, n: number): number[] {
  const { price, lo, hi } = sampleQuote(symbol);
  const r = rng(symbol + n);
  const out: number[] = [];
  let v = lo + (hi - lo) * (0.2 + r() * 0.4);
  for (let i = 0; i < n; i++) {
    v += (r() - 0.47) * (hi - lo) * 0.18;
    v = Math.min(hi, Math.max(lo, v));
    out.push(v);
  }
  // Ease the walk onto today's price so the line ends there without a jump.
  const gap = price - out[n - 1];
  return out.map((x, i) => {
    const y = x + gap * (n > 1 ? i / (n - 1) : 1);
    return Math.round(Math.min(hi, Math.max(lo, y)) * 100) / 100;
  });
}

/** Price axis label with enough precision for cheap stocks. */
export const priceAxis = (v: number) => "$" + (v < 20 ? v.toFixed(2) : v < 200 ? v.toFixed(1).replace(/\.0$/, "") : Math.round(v));

/** Popular names (as in Apple's Stocks app) for quick picks and the default watchlist. */
export const POPULAR = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "BRK.B", "WMT", "NFLX", "DIS", "KO"];
