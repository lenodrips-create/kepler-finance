"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Plus, X } from "lucide-react";
import { Sparkline, TrendChart, signed } from "@/components/charts";
import { PurchaseDateFields } from "@/components/purchase-date-fields";
import { StockSearch } from "@/components/stock-search";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/lib/profile";
import { EMPTY_DRAFT, formatPurchase, toDraft, validateDraft, type DraftDate, type PurchaseDate } from "@/lib/purchase";
import { MONTHS } from "@/lib/sample-data";
import { formatRevenue, getLargestByRevenue, getStocks, priceAxis, sampleQuote, sampleSeries, type Stock } from "@/lib/stocks";

function StockRow({ s, bought }: { s: Stock; bought?: PurchaseDate | null }) {
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
      {bought !== undefined && <td className="r num">{formatPurchase(bought ?? undefined)}</td>}
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

function StockTable({ rows, caption, purchases }: { rows: Stock[]; caption: string; purchases?: Record<string, PurchaseDate> }) {
  return (
    <table>
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          <th>Symbol</th>
          <th className="hide-sm">Company</th>
          {purchases && <th className="r">Bought</th>}
          <th className="r hide-sm">Revenue</th>
          <th className="r">Price</th>
          <th className="r">Day</th>
          <th className="r hide-sm">30d</th>
          <th className="r hide-sm">52w range</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((s) => (
          <StockRow key={s.symbol} s={s} bought={purchases ? purchases[s.symbol] ?? null : undefined} />
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
  const bought = detail ? profile?.purchases[detail.symbol] : undefined;

  // "Add to my stocks" (or "Edit date") opens the purchase-date form first.
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState<DraftDate>(EMPTY_DRAFT);
  const [showErrors, setShowErrors] = React.useState(false);
  React.useEffect(() => setAdding(false), [symbol]);
  const check = validateDraft(draft);

  const openForm = () => {
    setDraft(toDraft(bought));
    setShowErrors(false);
    setAdding(true);
  };
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !detail) return;
    if (!check.value) {
      setShowErrors(true);
      const k = check.errors.month ? "month" : check.errors.day ? "day" : "year";
      document.getElementById(`add-${detail.symbol}-${k}`)?.focus();
      return;
    }
    const holdings = isHeld ? profile.holdings : [...profile.holdings, detail.symbol];
    setProfile({ ...profile, holdings, purchases: { ...profile.purchases, [detail.symbol]: check.value } });
    setAdding(false);
  };
  const remove = () => {
    if (!profile || !detail) return;
    const { [detail.symbol]: _removed, ...rest } = profile.purchases;
    setProfile({ ...profile, holdings: profile.holdings.filter((h) => h !== detail.symbol), purchases: rest });
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
                {isHeld ? (
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <Check className="h-4 w-4 text-[#1E6B4F]" aria-hidden="true" />
                      In your stocks{bought ? ` · bought ${formatPurchase(bought)}` : ""}
                    </span>
                    {!adding && (
                      <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={openForm}>
                        {bought ? "Edit date" : "Add date"}
                      </Button>
                    )}
                    <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={remove}>
                      Remove
                    </Button>
                  </div>
                ) : (
                  !adding && (
                    <Button type="button" className="shrink-0 rounded-full" onClick={openForm}>
                      <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                      Add to my stocks
                    </Button>
                  )
                )}
              </div>

              {adding && (
                <form
                  onSubmit={save}
                  noValidate
                  aria-label={`When did you buy ${detail.symbol}?`}
                  className="mb-8 rounded-2xl border border-[#D9D5CB] bg-[#FBFAF7] p-5 sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-medium">When did you buy {detail.symbol}?</h3>
                      <p className="mt-1 text-sm text-[#6A6860]">Month and year are enough. Add the day if you know it.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAdding(false)}
                      aria-label="Cancel"
                      className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#6A6860] hover:bg-[#EDEAE3] hover:text-[#1A1A17]"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <PurchaseDateFields
                    idPrefix={`add-${detail.symbol}`}
                    legend={<span className="sr-only">Purchase date for {detail.symbol}</span>}
                    value={draft}
                    onChange={setDraft}
                    errors={showErrors ? check.errors : undefined}
                    className="mt-4 max-w-md"
                  />
                  <div className="mt-5 flex gap-2">
                    <Button type="submit" className="rounded-full">
                      {isHeld ? "Save date" : "Add to my stocks"}
                    </Button>
                    <Button type="button" variant="ghost" className="rounded-full" onClick={() => setAdding(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
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
          <StockTable rows={held} caption="Your stocks" purchases={profile?.purchases ?? {}} />
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
