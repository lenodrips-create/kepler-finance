"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { Sparkline, TrendChart, signed } from "@/components/charts";
import { StockSearch } from "@/components/stock-search";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/lib/profile";
import { MONTHS } from "@/lib/sample-data";
import { formatRevenue, getLargestByRevenue, getStocks, priceAxis, sampleQuote, sampleSeries, type Stock } from "@/lib/stocks";

function StockRow({ s }: { s: Stock }) {
  const q = sampleQuote(s.symbol);
  const pos = ((q.price - q.lo) / (q.hi - q.lo)) * 100;
  return (
    <tr>
      <td>
        <Link className="tick hover:underline" href={`/stocks/?s=${encodeURIComponent(s.symbol)}`}>
          {s.symbol}
        </Link>
      </td>
      <td className="co hide-sm">
        <span className="line-clamp-1">{s.name}</span>
      </td>
      <td className="r num hide-sm">{formatRevenue(s.revenue_usd)}</td>
      <td className="r num">{q.price.toFixed(2)}</td>
      <td className="r num">{signed(q.change)}</td>
      <td className="r hide-sm">
        <Sparkline values={sampleSeries(s.symbol, 30)} width={90} height={24} />
      </td>
      <td className="r hide-sm">
        <div className="range" title={`${q.lo} – ${q.hi}`}>
          <i style={{ left: `${pos}%` }} />
        </div>
      </td>
    </tr>
  );
}

function StockTable({ rows, caption }: { rows: Stock[]; caption: string }) {
  return (
    <table>
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          <th>Symbol</th>
          <th className="hide-sm">Company</th>
          <th className="r hide-sm">Revenue</th>
          <th className="r">Price</th>
          <th className="r">Day</th>
          <th className="r hide-sm">30d</th>
          <th className="r hide-sm">52w range</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((s) => (
          <StockRow key={s.symbol} s={s} />
        ))}
      </tbody>
    </table>
  );
}

function StocksView() {
  const params = useSearchParams();
  const router = useRouter();
  const symbol = params.get("s")?.toUpperCase() ?? "";
  const [profile, setProfile] = useProfile();
  const [detail, setDetail] = React.useState<Stock | null | undefined>(undefined);
  const [held, setHeld] = React.useState<Stock[]>([]);
  const [largest, setLargest] = React.useState<Stock[] | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    getLargestByRevenue(15).then(setLargest).catch(() => setError(true));
  }, []);

  React.useEffect(() => {
    if (!symbol) return setDetail(undefined);
    setDetail(undefined);
    getStocks([symbol])
      .then((r) => setDetail(r[0] ?? null))
      .catch(() => setError(true));
  }, [symbol]);

  const holdingsKey = profile?.holdings.join(",") ?? "";
  React.useEffect(() => {
    if (!profile) return;
    getStocks(profile.holdings).then(setHeld).catch(() => setError(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdingsKey]);

  const isHeld = !!detail && !!profile?.holdings.includes(detail.symbol);
  const toggleHolding = () => {
    if (!profile || !detail) return;
    const holdings = isHeld ? profile.holdings.filter((h) => h !== detail.symbol) : [...profile.holdings, detail.symbol];
    setProfile({ ...profile, holdings });
  };

  return (
    <section aria-label="Stocks">
      <h2 className="page-h">Stocks</h2>
      <p className="page-sub">Search every company listed on NASDAQ, NYSE, NYSE American, NYSE Arca and Cboe.</p>

      <StockSearch
        size="lg"
        label="Search for a company"
        placeholder="Search by company name or ticker, e.g. “Apple” or “NVDA”"
        selected={profile?.holdings}
        onSelect={(s) => router.push(`/stocks/?s=${encodeURIComponent(s.symbol)}`)}
        className="mb-10 max-w-2xl"
      />

      {error && (
        <p role="alert" className="mb-8 rounded-lg border border-[#A8362A]/20 bg-[#A8362A]/10 p-4 text-sm text-[#A8362A]">
          Couldn’t reach the stock database. Check your connection and reload.
        </p>
      )}

      {symbol && (
        <div className="mb-12" aria-live="polite">
          {detail === undefined && <div className="h-[340px] animate-pulse rounded bg-[#EDEAE3]" aria-label="Loading stock" />}
          {detail === null && <p className="text-[#6A6860]">No listed stock with the ticker “{symbol}”.</p>}
          {detail && (
            <div>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-4 border-b border-[#1A1A17] pb-3">
                <div className="min-w-0">
                  <h2 className="text-2xl font-medium tracking-tight">
                    <span className="font-mono font-semibold">{detail.symbol}</span> · {detail.name}
                  </h2>
                  <p className="mt-1 font-mono text-xs text-[#6A6860]">
                    {detail.exchange}
                    {detail.is_etf ? " · ETF" : ""}
                    {detail.revenue_usd ? ` · ${formatRevenue(detail.revenue_usd)} revenue FY${detail.revenue_fy}` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant={isHeld ? "outline" : "default"}
                  className="shrink-0 rounded-full"
                  onClick={toggleHolding}
                  aria-pressed={isHeld}
                >
                  {isHeld ? <Check className="mr-1.5 h-4 w-4" aria-hidden="true" /> : <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />}
                  {isHeld ? "In your stocks" : "Add to my stocks"}
                </Button>
              </div>
              <div className="figures !mb-6" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
                <div className="fig">
                  <div className="k">Price (sample)</div>
                  <div className="v">${sampleQuote(detail.symbol).price.toFixed(2)}</div>
                  <div className="d">{signed(sampleQuote(detail.symbol).change)} today</div>
                </div>
                <div className="fig">
                  <div className="k">Annual revenue</div>
                  <div className="v">{formatRevenue(detail.revenue_usd)}</div>
                  <div className="d">{detail.revenue_fy ? `SEC filing, FY${detail.revenue_fy}` : "not reported to SEC"}</div>
                </div>
                <div className="fig">
                  <div className="k">52-week range (sample)</div>
                  <div className="v !text-xl">
                    ${sampleQuote(detail.symbol).lo.toFixed(2)} – ${sampleQuote(detail.symbol).hi.toFixed(2)}
                  </div>
                </div>
              </div>
              <TrendChart
                labels={MONTHS}
                values={sampleSeries(detail.symbol, 12)}
                format={(v) => "$" + v.toFixed(2)}
                axisFormat={priceAxis}
                label={`${detail.symbol} monthly share price (sample)`}
                height={280}
              />
            </div>
          )}
        </div>
      )}

      {held.length > 0 && (
        <div className="mb-12">
          <div className="sec-h">
            <h2>Your stocks</h2>
            <span>{held.length}</span>
          </div>
          <StockTable rows={held} caption="Your stocks" />
        </div>
      )}

      <div className="sec-h">
        <h2>Largest companies by revenue</h2>
        <span>SEC filings</span>
      </div>
      {largest ? (
        <StockTable rows={largest} caption="Largest companies by revenue" />
      ) : (
        !error && <div className="h-[400px] animate-pulse rounded bg-[#EDEAE3]" aria-label="Loading" />
      )}
    </section>
  );
}

export default function StocksPage() {
  return (
    <React.Suspense fallback={null}>
      <StocksView />
    </React.Suspense>
  );
}
