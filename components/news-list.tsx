"use client";

import * as React from "react";
import { getNews, timeAgo, type NewsItem } from "@/lib/news";

const Placeholder = ({ label }: { label: string }) => (
  <div className="ph" role="img" aria-label={label}>
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <circle cx="9" cy="10" r="2" />
      <path d="M21 17l-5-5-9 8" />
    </svg>
  </div>
);

function NewsImage({ item }: { item: NewsItem }) {
  const [src, setSrc] = React.useState(item.image ?? item.thumbnail);
  if (!src) return <Placeholder label="No image" />;
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
    getNews(symbols, limit)
      .then((n) => live && setItems(n))
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
