import { supabase } from "@/lib/supabase";

/** A Yahoo Finance story, from the stock_news() Postgres function (cached 15 min). */
export interface NewsItem {
  uuid: string;
  title: string;
  publisher: string | null;
  link: string;
  published_at: string;
  thumbnail: string | null; // small square (140px)
  image: string | null; // original size
  tickers: string[];
}

/** News for up to 5 tickers; with no tickers, general stock-market news. */
export async function getNews(symbols: string[], limit = 6): Promise<NewsItem[]> {
  const { data, error } = await supabase.rpc("stock_news", { syms: symbols.slice(0, 5), lim: limit });
  if (error) throw error;
  if (!Array.isArray(data)) return [];
  // Only render well-formed https links/images.
  return (data as NewsItem[]).filter((n) => n && typeof n.title === "string" && /^https:\/\//.test(n.link));
}

export function timeAgo(iso: string, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
