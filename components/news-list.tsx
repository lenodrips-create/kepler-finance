"use client";

import * as React from "react";
import { getNews, timeAgo, type NewsItem } from "@/lib/news";

/** Publisher initials, used when a story has no image (e.g. "The Wall Street Journal" -> "WSJ"). */
function initials(publisher: string | null) {
  const words = (publisher ?? "Yahoo Finance").replace(/^the\s+/i, "").replace(/\.(com|net|org)$/i, "").split(/[\s.-]+/).filter(Boolean);
  return (words.length > 1 ? words.slice(0, 3).map((w) => w[0]) : [words[0]?.slice(0, 2) ?? "YF"]).join("").toUpperCase();
}

function PublisherTile({ publisher }: { publisher: string | null }) {
  return (
    <div className="ph !bg-[#E3EFE8]" aria-hidden="true">
      <span className="font-mono text-2xl font-semibold tracking-tight text-[#1E6B4F]">{initials(publisher)}</span>
    </div>
  );
}

function NewsImage({ item }: { item: NewsItem }) {
  const [src, setSrc] = React.useState(item.image ?? item.thumbnail);
  if (!src) return <PublisherTile publisher={item.publisher} />;
  return (
    <div className="ph overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element -- static export, remote news images */}
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="h-full w-full object-cover"
        onError={() => setSrc(src === item.image && item.thumbnail ? item.thumbnail : null)}
      />
    </div>
  );
}

interface NewsListProps {
  /** Tickers to get news for; empty = general stock-market news. */
  symbols: string[];
  limit?: number;
  title?: string;
}

/** Newest `limit` stories, preferring ones that have an article image; result stays newest-first. */
function pickWithImages(items: NewsItem[], limit: number): NewsItem[] {
  const withImg = items.filter((n) => n.image || n.thumbnail);
  const chosen = new Set(withImg.slice(0, limit).map((n) => n.uuid));
  for (const n of items) if (chosen.size < limit) chosen.add(n.uuid);
  return items.filter((n) => chosen.has(n.uuid));
}

/** Yahoo Finance headlines in the dashboard's news-card layout. */
export function NewsList({ symbols, limit = 6, title = "News" }: NewsListProps) {
  const [items, setItems] = React.useState<NewsItem[] | null>(null);
  const [error, setError] = React.useState(false);
  const [now, setNow] = React.useState(() => Date.now());
  const key = symbols.join(",");

  React.useEffect(() => {
    let live = true;
    setItems(null);
    setError(false);
    // Ask for a few extra stories so the newest ones with article images can be shown first.
    getNews(symbols, Math.min(24, limit + 6))
      .then((n) => live && setItems(pickWithImages(n, limit)))
      .catch(() => live && setError(true));
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      live = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, limit]);

  return (
    <div className="news">
      <div className="sec-h">
        <h2>{title}</h2>
        <span>Yahoo Finance</span>
      </div>
      {error ? (
        <p className="text-sm text-[#6A6860]" role="status">
          News is unavailable right now. Try again in a few minutes.
        </p>
      ) : items === null ? (
        <ul aria-busy="true" aria-label="Loading news">
          {Array.from({ length: Math.min(limit, 3) }, (_, i) => (
            <li key={i}>
              <div className="ph animate-pulse" />
              <div className="mt-2 h-3 w-16 animate-pulse rounded bg-[#E6E2D8]" />
              <div className="mt-2 h-4 w-full animate-pulse rounded bg-[#E6E2D8]" />
              <div className="mt-1.5 h-4 w-2/3 animate-pulse rounded bg-[#E6E2D8]" />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <p className="text-sm text-[#6A6860]" role="status">
          No recent news.
        </p>
      ) : (
        <ul>
          {items.map((n) => (
            <li key={n.uuid}>
              <a href={n.link} target="_blank" rel="noopener noreferrer">
                <NewsImage item={n} />
                <div className="cat">{n.publisher ?? "Yahoo Finance"}</div>
                <h3>
                  {n.title}
                  <span className="sr-only"> (opens in a new tab)</span>
                </h3>
                <time dateTime={n.published_at} title={new Date(n.published_at).toLocaleString()}>
                  {timeAgo(n.published_at, now)}
                </time>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
