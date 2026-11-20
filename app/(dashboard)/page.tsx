"use client";

import * as React from "react";
import Link from "next/link";
import { TrendChart, Sparkline, signed } from "@/components/charts";
import { useProfile } from "@/lib/profile";
import { ACCOUNTS, MONTHS, NEWS, REVENUE, money } from "@/lib/sample-data";
import { POPULAR, formatRevenue, getStocks, priceAxis, sampleQuote, sampleSeries, topByRevenue, type Stock } from "@/lib/stocks";

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
  const total = ACCOUNTS.reduce((a, x) => a + x[2], 0);
  const watch = [...holdings, ...POPULAR.filter((s) => !holdings.includes(s))].slice(0, 6);

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
        <div className="fig">
          <div className="k">Today</div>
          <div className="v pos">+$312</div>
          <div className="d">+0.65%</div>
        </div>
        <div className="fig">
          <div className="k">Positions</div>
          <div className="v" id="positions">{holdings.length || 9}</div>
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
              <TrendChart
                labels={MONTHS}
                values={sampleSeries(top.symbol, 12)}
                format={(v) => "$" + v.toFixed(2)}
                axisFormat={priceAxis}
                label={`${top.symbol} monthly share price (sample)`}
              />
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

          <div className="news">
            <div className="sec-h">
              <h2>News</h2>
              <span>today</span>
            </div>
            <ul>
              {NEWS.map((n) => (
                <li key={n.title}>
                  <a href="#">
                    <div className="ph" role="img" aria-label={`${n.cat} image placeholder`}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="3" y="4" width="18" height="16" rx="1" />
                        <circle cx="9" cy="10" r="2" />
                        <path d="M21 17l-5-5-9 8" />
                      </svg>
                    </div>
                    <div className="cat">{n.cat}</div>
                    <h3>{n.title}</h3>
                    <time>{n.time}</time>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div>
          <div className="sec-h">
            <h2>{holdings.length ? "Your stocks" : "Watchlist"}</h2>
            <span>last 30d</span>
          </div>
          <table>
            <tbody>
              {watch.map((sym) => {
                const q = sampleQuote(sym);
                return (
                  <tr key={sym}>
                    <td>
                      <Link className="tick hover:underline" href={`/stocks/?s=${encodeURIComponent(sym)}`}>
                        {sym}
                      </Link>
                    </td>
                    <td className="r">
                      <Sparkline values={sampleSeries(sym, 30)} />
                    </td>
                    <td className="r num">{q.price.toFixed(2)}</td>
                    <td className="r num">{signed(q.change)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
