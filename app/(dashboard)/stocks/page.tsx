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
import { dayChange, signedUsd, usd, usePositions, useQuotes, type Position, type Quote } from "@/lib/prices";
import { EMPTY_DRAFT, formatPurchase, toDraft, validateDraft, type DraftDate } from "@/lib/purchase";
import { formatRevenue, getLargestByRevenue, getStocks, priceAxis, type Stock } from "@/lib/stocks";

const Dash = () => <span className="co">—</span>;
const Loading = () => <span className="inline-block h-3 w-12 animate-pulse rounded bg-[#E6E2D8] align-middle" aria-label="Loading" />;

/** Price cell helper: loading / no data / value. */
function q<T>(quote: Quote | null | undefined, f: (q: Quote) => T): React.ReactNode {
  if (quote === undefined) return <Loading />;
  if (quote === null) return <Dash />;
  return f(quote) as React.ReactNode;
}

function MarketTable({ rows, quotes, caption }: { rows: Stock[]; quotes: Record<string, Quote | null | undefined>; caption: string }) {
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
        {rows.map((s) => {
          const quote = quotes[s.symbol];
          return (
            <tr key={s.symbol}>
              <td>
                <Link className="tick hover:underline" href={`/stocks/?s=${encodeURIComponent(s.symbol)}`}>
                  {s.symbol}
                </Link>
              </td>
              <td className="co hide-sm">
                <span className="line-clamp-1">{s.name}</span>
              </td>
              <td className="r num hide-sm">{formatRevenue(s.revenue_usd)}</td>
              <td className="r num">{q(quote, (x) => x.price.toFixed(2))}</td>
              <td className="r num">{q(quote, (x) => signed(dayChange(x)))}</td>
              <td className="r hide-sm">{q(quote, (x) => <Sparkline values={x.spark} width={90} height={24} />)}</td>
              <td className="r hide-sm">
                {q(quote, (x) => (
                  <div className="range" title={`${x.lo52.toFixed(2)} – ${x.hi52.toFixed(2)}`}>
                    <i style={{ left: `${((x.price - x.lo52) / (x.hi52 - x.lo52 || 1)) * 100}%` }} />
                  </div>
                ))}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function GainCell({ p }: { p: Position }) {
  if (!p.purchase) return <span className="co">add date</span>;
  if (p.buy === undefined || p.quote === undefined) return <Loading />;
  if (p.returnPct === undefined) return <Dash />;
  return (
    <span className="flex flex-col items-end leading-tight">
      {p.gain !== undefined && <span className={p.gain >= 0 ? "pos" : "neg"}>{signedUsd(p.gain)}</span>}
      <span className={p.gain !== undefined ? "text-xs" : ""}>{signed(p.returnPct)}</span>
    </span>
  );
}

function HoldingsTable({ positions, names }: { positions: Position[]; names: Record<string, string> }) {
  const withAmt = positions.filter((p) => p.value !== undefined);
  const invested = withAmt.reduce((a, p) => a + (p.invested ?? 0), 0);
  const value = withAmt.reduce((a, p) => a + (p.value ?? 0), 0);
  return (
    <table>
      <caption className="sr-only">Your stocks and how much you’ve made since buying</caption>
      <thead>
        <tr>
          <th>Symbol</th>
          <th className="hide-sm">Company</th>
          <th className="r">Bought</th>
          <th className="r hide-sm">Paid</th>
          <th className="r">Price</th>
          <th className="r hide-sm">Invested</th>
          <th className="r hide-sm">Value</th>
          <th className="r">Gain</th>
        </tr>
      </thead>
      <tbody>
        {positions.map((p) => (
          <tr key={p.symbol}>
            <td>
              <Link className="tick hover:underline" href={`/stocks/?s=${encodeURIComponent(p.symbol)}`}>
                {p.symbol}
              </Link>
            </td>
            <td className="co hide-sm">
              <span className="line-clamp-1">{names[p.symbol]}</span>
            </td>
            <td className="r num whitespace-nowrap">{formatPurchase(p.purchase)}</td>
            <td className="r num hide-sm">{!p.purchase ? <Dash /> : p.buy === undefined ? <Loading /> : p.buy ? p.buy.close.toFixed(2) : <Dash />}</td>
            <td className="r num">{q(p.quote, (x) => x.price.toFixed(2))}</td>
            <td className="r num hide-sm">{p.purchase?.amount ? usd(p.purchase.amount, 0) : <Dash />}</td>
            <td className="r num hide-sm">{p.value !== undefined ? usd(p.value, 0) : <Dash />}</td>
            <td className="r num">
              <GainCell p={p} />
            </td>
          </tr>
        ))}
      </tbody>
      {withAmt.length > 0 && (
        <tfoot>
          <tr className="font-medium">
            <td colSpan={2} className="hide-sm">
              Total
            </td>
            <td className="sm:hidden">Total</td>
            <td className="hide-sm" />
            <td />
            <td />
            <td className="r num hide-sm">{usd(invested, 0)}</td>
            <td className="r num hide-sm">{usd(value, 0)}</td>
            <td className="r num">
              <span className={value - invested >= 0 ? "pos" : "neg"}>{signedUsd(value - invested)}</span>
            </td>
          </tr>
        </tfoot>
      )}
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

  const holdings = profile?.holdings ?? [];
  const purchases = profile?.purchases ?? {};
  React.useEffect(() => {
    if (!profile) return;
    getStocks(profile.holdings).then(setHeld).catch(() => setError(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings.join(",")]);

  const positions = usePositions(holdings, purchases);
  const quotes = useQuotes([...(symbol ? [symbol] : []), ...(largest ?? []).map((s) => s.symbol)]);
  const names = Object.fromEntries(held.map((s) => [s.symbol, s.name]));

  const isHeld = !!detail && holdings.includes(detail.symbol);
  const bought = detail ? purchases[detail.symbol] : undefined;
  const detailPos = positions.find((p) => p.symbol === detail?.symbol);
  const dq = detail ? quotes[detail.symbol] : undefined;

  // "Add to my stocks" (or "Edit") opens the purchase form first.
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
      const k = check.errors.month ? "month" : check.errors.day ? "day" : check.errors.year ? "year" : "amount";
      document.getElementById(`add-${detail.symbol}-${k}`)?.focus();
      return;
    }
    const next = isHeld ? profile.holdings : [...profile.holdings, detail.symbol];
    setProfile({ ...profile, holdings: next, purchases: { ...profile.purchases, [detail.symbol]: check.value } });
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
        selected={holdings}
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
                        {bought ? "Edit" : "Add date"}
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
                      <p className="mt-1 text-sm text-[#6A6860]">Month and year are enough. Add the day and amount if you know them.</p>
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
                      {isHeld ? "Save" : "Add to my stocks"}
                    </Button>
                    <Button type="button" variant="ghost" className="rounded-full" onClick={() => setAdding(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {dq === null ? (
                <p className="mb-6 text-sm text-[#6A6860]">No price data is available for {detail.symbol} right now.</p>
              ) : (
                <div className="figures !mb-6" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
                  <div className="fig">
                    <div className="k">Price</div>
                    <div className="v">{dq ? usd(dq.price) : <Loading />}</div>
                    <div className="d">{dq ? <>{signed(dayChange(dq))} today</> : " "}</div>
                  </div>
                  {detailPos?.returnPct !== undefined ? (
                    <div className="fig">
                      <div className="k">Since you bought ({formatPurchase(detailPos.purchase)})</div>
                      <div className={`v ${(detailPos.gain ?? detailPos.returnPct) >= 0 ? "pos" : "neg"}`}>
                        {detailPos.gain !== undefined ? signedUsd(detailPos.gain) : signed(detailPos.returnPct)}
                      </div>
                      <div className="d">
                        {detailPos.gain !== undefined && <>{signed(detailPos.returnPct)} · </>}
                        paid {usd(detailPos.buy!.close)}
                      </div>
                    </div>
                  ) : (
                    <div className="fig">
                      <div className="k">Annual revenue</div>
                      <div className="v">{formatRevenue(detail.revenue_usd)}</div>
                      <div className="d">{detail.revenue_fy ? `SEC filing, FY${detail.revenue_fy}` : "not reported to SEC"}</div>
                    </div>
                  )}
                  <div className="fig">
                    <div className="k">52-week range</div>
                    <div className="v !text-xl">{dq ? `${usd(dq.lo52)} – ${usd(dq.hi52)}` : <Loading />}</div>
                  </div>
                </div>
              )}
              {dq ? (
                <TrendChart
                  labels={dq.months}
                  values={dq.monthly}
                  format={(v) => usd(v)}
                  axisFormat={priceAxis}
                  label={`${detail.symbol} month-end share price`}
                  height={280}
                />
              ) : (
                dq === undefined && <div className="h-[280px] animate-pulse rounded bg-[#EDEAE3]" aria-label="Loading chart" />
              )}
            </div>
          )}
        </div>
      )}

      {holdings.length > 0 && (
        <div className="mb-12">
          <div className="sec-h">
            <h2>Your stocks</h2>
            <span>since you bought</span>
          </div>
          <HoldingsTable positions={positions} names={names} />
          <p className="mt-3 text-xs text-[#6A6860]">
            Gain = change in share price since your purchase day (split-adjusted; dividends not included). With no day given we use the
            first trading day of that month.
          </p>
        </div>
      )}

      <div className="sec-h">
        <h2>Largest companies by revenue</h2>
        <span>SEC filings</span>
      </div>
      {largest ? (
        <MarketTable rows={largest} quotes={quotes} caption="Largest companies by revenue" />
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
