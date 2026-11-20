"use client";

import * as React from "react";
import Link from "next/link";
import { TrendChart, Sparkline, signed } from "@/components/charts";
import { NewsList } from "@/components/news-list";
import { useProfile } from "@/lib/profile";
import { dayChange, signedUsd, usd, usePositions, useQuotes } from "@/lib/prices";
import { formatPurchase } from "@/lib/purchase";
import { ACCOUNTS, MONTHS, REVENUE, money } from "@/lib/sample-data";
import { POPULAR, formatRevenue, getStocks, priceAxis, topByRevenue, type Stock } from "@/lib/stocks";

const Loading = ({ w = "w-12" }: { w?: string }) => (
  <span className={`inline-block h-3 ${w} animate-pulse rounded bg-[#E6E2D8] align-middle`} aria-label="Loading" />
);

export default function HomePage() {
  const [profile] = useProfile();
  const holdings = profile?.holdings ?? [];
  const [rows, setRows] = React.useState<Stock[] | null>(null);

  React.useEffect(() => {
    if (!profile) return;
    if (!profile.holdings.length) return setRows([]);
    getStocks(profile.holdings)
      .then(setRows)
      .catch(() => setRows([]));
  }, [profile]);

  const top = rows ? topByRevenue(rows) : undefined;
  const positions = usePositions(holdings, profile?.purchases ?? {});
  const watch = holdings.length ? [] : POPULAR.slice(0, 6);
  const quotes = useQuotes([...(top ? [top.symbol] : []), ...watch]);
  const topQuote = top ? quotes[top.symbol] : undefined;

  const total = ACCOUNTS.reduce((a, x) => a + x[2], 0);
  const withAmt = positions.filter((p) => p.value !== undefined);
  const invested = withAmt.reduce((a, p) => a + (p.invested ?? 0), 0);
  const gain = withAmt.reduce((a, p) => a + (p.gain ?? 0), 0);
  const priced = positions.filter((p) => p.returnPct !== undefined);
  const loadingGains = positions.some((p) => p.purchase && (p.buy === undefined || p.quote === undefined));

  return (
    <section aria-label="Home">
      <div className="figures">
        <div className="fig">
          <div className="k">Net worth</div>
          <div className="v">{money(total)}</div>
          <div className="d">
            <span className="pos">+$1,131</span> &nbsp;+2.4% this month
          </div>
        </div>
        <div className="fig">
          <div className="k">Revenue, November</div>
          <div className="v">$12,840</div>
          <div className="d">
            <span className="pos">+8.1%</span> vs Oct
          </div>
        </div>
        {holdings.length ? (
          <div className="fig">
            <div className="k">Made on your stocks</div>
            <div className={`v ${gain >= 0 ? "pos" : "neg"}`} id="totalGain">
              {withAmt.length ? signedUsd(gain, 0) : loadingGains ? <Loading w="w-20" /> : "—"}
            </div>
            <div className="d">
              {withAmt.length
                ? `${gain >= 0 ? "+" : "−"}${Math.abs((gain / invested) * 100).toFixed(1)}% on ${usd(invested, 0)}`
                : priced.length
                  ? "add amounts to see dollars"
                  : "since you bought"}
            </div>
          </div>
        ) : (
          <div className="fig">
            <div className="k">Today</div>
            <div className="v pos">+$312</div>
            <div className="d">+0.65%</div>
          </div>
        )}
        <div className="fig">
          <div className="k">Positions</div>
          <div className="v" id="positions">
            {holdings.length || 9}
          </div>
          <div className="d">{holdings.length ? `${holdings.length} ${holdings.length === 1 ? "stock" : "stocks"}` : "3 accounts"}</div>
        </div>
      </div>

      <div className="cols">
        <div>
          {top ? (
            <>
              <div className="sec-h">
                <h2 id="homeChartTitle">
                  <Link href={`/stocks/?s=${encodeURIComponent(top.symbol)}`} className="hover:underline">
                    {top.symbol} · {top.name}
                  </Link>
                </h2>
                <span>
                  top holding by revenue · {formatRevenue(top.revenue_usd)} FY{top.revenue_fy}
                </span>
              </div>
              {topQuote ? (
                <TrendChart
                  labels={topQuote.months}
                  values={topQuote.monthly}
                  format={(v) => usd(v)}
                  axisFormat={priceAxis}
                  label={`${top.symbol} month-end share price`}
                />
              ) : topQuote === null ? (
                <p className="py-10 text-sm text-[#6A6860]">No price data for {top.symbol} right now.</p>
              ) : (
                <div className="h-[260px] animate-pulse rounded bg-[#EDEAE3]" aria-label="Loading chart" />
              )}
            </>
          ) : (
            <>
              <div className="sec-h">
                <h2 id="homeChartTitle">Revenue</h2>
                <span>12 months</span>
              </div>
              {rows === null && profile?.holdings.length ? (
                <div className="h-[260px] animate-pulse rounded bg-[#EDEAE3]" aria-label="Loading chart" />
              ) : (
                <TrendChart
                  labels={MONTHS}
                  values={REVENUE}
                  format={money}
                  axisFormat={(v) => `${Math.round(v / 1000)}k`}
                  label="Monthly revenue"
                />
              )}
            </>
          )}

          <NewsList symbols={holdings} limit={6} title={holdings.length ? "News on your stocks" : "News"} />
        </div>

        <div>
          {holdings.length ? (
            <>
              <div className="sec-h">
                <h2>Your stocks</h2>
                <span>since you bought</span>
              </div>
              <table>
                <caption className="sr-only">How much you’ve made on each stock since buying it</caption>
                <tbody>
                  {positions.map((p) => (
                    <tr key={p.symbol}>
                      <td>
                        <Link className="tick hover:underline" href={`/stocks/?s=${encodeURIComponent(p.symbol)}`}>
                          {p.symbol}
                        </Link>
                        <div className="co">{p.purchase ? formatPurchase(p.purchase) : "no date"}</div>
                      </td>
                      <td className="r num">
                        {p.quote === undefined ? <Loading /> : p.quote ? p.quote.price.toFixed(2) : "—"}
                        <div className="co">{p.quote ? signed(dayChange(p.quote)) : " "}</div>
                      </td>
                      <td className="r num">
                        {!p.purchase ? (
                          <Link href={`/stocks/?s=${encodeURIComponent(p.symbol)}`} className="co underline underline-offset-2">
                            add date
                          </Link>
                        ) : p.returnPct === undefined ? (
                          p.buy === undefined || p.quote === undefined ? <Loading /> : "—"
                        ) : (
                          <>
                            {p.gain !== undefined ? (
                              <span className={p.gain >= 0 ? "pos" : "neg"}>{signedUsd(p.gain, 0)}</span>
                            ) : (
                              signed(p.returnPct)
                            )}
                            <div className="co">{p.gain !== undefined ? signed(p.returnPct) : "add amount"}</div>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <>
              <div className="sec-h">
                <h2>Watchlist</h2>
                <span>last 30d</span>
              </div>
              <table>
                <tbody>
                  {watch.map((sym) => {
                    const qt = quotes[sym];
                    return (
                      <tr key={sym}>
                        <td>
                          <Link className="tick hover:underline" href={`/stocks/?s=${encodeURIComponent(sym)}`}>
                            {sym}
                          </Link>
                        </td>
                        <td className="r">{qt ? <Sparkline values={qt.spark} /> : null}</td>
                        <td className="r num">{qt === undefined ? <Loading /> : qt ? qt.price.toFixed(2) : "—"}</td>
                        <td className="r num">{qt ? signed(dayChange(qt)) : null}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
