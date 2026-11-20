import type { Metadata } from "next";
import { ACCOUNTS, ALLOC, money } from "@/lib/sample-data";

export const metadata: Metadata = { title: "Investments" };

const COLORS = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)"];

export default function InvestmentsPage() {
  const total = ACCOUNTS.reduce((a, x) => a + x[2], 0);
  return (
    <section aria-label="Investments">
      <h2 className="page-h">Investments</h2>
      <p className="page-sub">How the portfolio is split, and where it’s held.</p>
      <div className="cols">
        <div>
          <div className="sec-h">
            <h2>Allocation</h2>
            <span>{money(total)}</span>
          </div>
          <div className="stack" role="img" aria-label={ALLOC.map(([l, v]) => `${l} ${v}%`).join(", ")}>
            {ALLOC.map(([l, v], i) => (
              <i key={l} style={{ flex: v, background: COLORS[i] }} title={`${l} ${v}%`} />
            ))}
          </div>
          <table>
            <tbody>
              {ALLOC.map(([l, v], i) => (
                <tr key={l}>
                  <td>
                    <span className="sw" style={{ background: COLORS[i] }} />
                    {l}
                  </td>
                  <td className="r num">{v}%</td>
                  <td className="r num">{money((total * v) / 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <div className="sec-h">
            <h2>Accounts</h2>
            <span>{ACCOUNTS.length}</span>
          </div>
          <table>
            <tbody>
              {ACCOUNTS.map(([n, t, v]) => (
                <tr key={n}>
                  <td>
                    {n}
                    <div className="co">{t}</div>
                  </td>
                  <td className="r num">
                    {money(v)}
                    <div className="co">{((v / total) * 100).toFixed(0)}%</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
