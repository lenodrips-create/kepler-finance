"use client";

import { TrendChart, signed } from "@/components/charts";
import { MONTHS, REVENUE, money } from "@/lib/sample-data";

export default function RevenuePage() {
  const sum = REVENUE.reduce((a, b) => a + b, 0);
  const bi = REVENUE.indexOf(Math.max(...REVENUE));
  const rows = REVENUE.map((v, i) => ({ m: MONTHS[i], v, c: i ? ((v - REVENUE[i - 1]) / REVENUE[i - 1]) * 100 : null })).reverse();

  return (
    <section aria-label="Revenue">
      <h2 className="page-h">Revenue</h2>
      <p className="page-sub">Trailing twelve months.</p>
      <div className="figures" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <div className="fig">
          <div className="k">Trailing 12 months</div>
          <div className="v">{money(sum)}</div>
        </div>
        <div className="fig">
          <div className="k">Best month</div>
          <div className="v">{money(REVENUE[bi])}</div>
          <div className="d">{MONTHS[bi]}</div>
        </div>
        <div className="fig">
          <div className="k">Monthly average</div>
          <div className="v">{money(sum / REVENUE.length)}</div>
        </div>
      </div>
      <div className="cols">
        <div>
          <div className="sec-h">
            <h2>By month</h2>
            <span>USD</span>
          </div>
          <TrendChart
            labels={MONTHS}
            values={REVENUE}
            format={money}
            axisFormat={(v) => `${Math.round(v / 1000)}k`}
            label="Monthly revenue"
            height={300}
          />
        </div>
        <div>
          <div className="sec-h">
            <h2>Month over month</h2>
            <span />
          </div>
          <table>
            <tbody>
              {rows.map((r) => (
                <tr key={r.m}>
                  <td>{r.m}</td>
                  <td className="r num">{money(r.v)}</td>
                  <td className="r num">{r.c === null ? <span className="co">—</span> : signed(r.c)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
