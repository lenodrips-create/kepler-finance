"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, Check, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PurchaseDateFields } from "@/components/purchase-date-fields";
import { StockSearch } from "@/components/stock-search";
import { EMPTY_DRAFT, validateDraft, type DraftDate, type PurchaseDate } from "@/lib/purchase";
import type { Profile } from "@/lib/profile";
import { POPULAR, formatRevenue, getStocks, topByRevenue, type Stock } from "@/lib/stocks";
import { cn } from "@/lib/utils";

// --------------------------------
// Pixel icons (12x12 grids; "." = transparent)
// --------------------------------

type Palette = Record<string, string>;

function PixelIcon({ grid, palette }: { grid: string[]; palette: Palette }) {
  const size = grid.length;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-11 w-11" shapeRendering="crispEdges" aria-hidden="true">
      {grid.flatMap((row, y) =>
        [...row].map((ch, x) =>
          palette[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={palette[ch]} /> : null,
        ),
      )}
    </svg>
  );
}

const ICONS = {
  stocks: {
    tint: "bg-[#E3EFE8]",
    palette: { k: "#1A1A17", g: "#1E6B4F", l: "#5E9C7E" },
    grid: [
      "............",
      "..........gg",
      "..........gg",
      ".......ll.gg",
      ".......ll.gg",
      "....ll.ll.gg",
      "....ll.ll.gg",
      ".ll.ll.ll.gg",
      ".ll.ll.ll.gg",
      ".ll.ll.ll.gg",
      "kkkkkkkkkkkk",
      "............",
    ],
  },
  investments: {
    tint: "bg-[#F5EBD6]",
    palette: { y: "#E2B44C", o: "#B8893B", d: "#8A6420" },
    grid: [
      "............",
      "...yyyyyy...",
      "..yyyyyyyy..",
      "..oooooooo..",
      "..yyyyyyyy..",
      "..oooooooo..",
      "..yyyyyyyy..",
      "..oooooooo..",
      "..yyyyyyyy..",
      "..dddddddd..",
      "...dddddd...",
      "............",
    ],
  },
  revenue: {
    tint: "bg-[#E6EEF2]",
    palette: { n: "#4D7A66", w: "#D5E8DC", c: "#1E6B4F" },
    grid: [
      "............",
      "............",
      "nnnnnnnnnnnn",
      "nwwwwwwwwwwn",
      "nwcwwwwwwcwn",
      "nwwwwccwwwwn",
      "nwwwcwwcwwwn",
      "nwwwwccwwwwn",
      "nwcwwwwwwcwn",
      "nwwwwwwwwwwn",
      "nnnnnnnnnnnn",
      "............",
    ],
  },
  savings: {
    tint: "bg-[#F6E4E8]",
    palette: { p: "#E79AAE", P: "#C9748A", k: "#1A1A17", y: "#E2B44C" },
    grid: [
      "............",
      ".....yy.....",
      ".....yy.....",
      "..pppppppp..",
      ".pppppppppp.",
      "ppkpppppppPP",
      "pppppppppppP",
      ".pppppppppp.",
      "..pppppppp..",
      "..PP....PP..",
      "..PP....PP..",
      "............",
    ],
  },
} satisfies Record<string, { tint: string; palette: Palette; grid: string[] }>;

type TrackId = keyof typeof ICONS;

const TRACK_OPTIONS: { id: TrackId; title: string; detail: string }[] = [
  { id: "stocks", title: "Stocks", detail: "Watchlists, prices, movers" },
  { id: "investments", title: "Investments", detail: "Portfolio, allocation, returns" },
  { id: "revenue", title: "Revenue", detail: "Income, invoices, growth" },
  { id: "savings", title: "Savings", detail: "Goals, budgets, cash" },
];

const STEPS = ["name", "holdings", "purchased", "tracking"] as const;

// --------------------------------
// Shared bits
// --------------------------------

function StepHeading({ id, pill, title, sub }: { id: string; pill: string; title: string; sub: React.ReactNode }) {
  return (
    <div className="mt-8 flex flex-col items-center text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        {pill}
      </span>
      <h1 id={id} className="mt-5 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-md text-base text-muted-foreground">{sub}</p>
    </div>
  );
}

function CheckDot({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        on ? "border-foreground bg-foreground text-background" : "border-input bg-card",
      )}
      aria-hidden="true"
    >
      {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
    </span>
  );
}

const cardBase =
  "relative cursor-pointer rounded-2xl border-2 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
const cardState = (on: boolean) =>
  on ? "border-foreground bg-card" : "border-transparent bg-secondary/60 ring-1 ring-inset ring-border hover:bg-secondary";

// --------------------------------
// Onboarding
// --------------------------------

interface OnboardingProps {
  onBack: () => void;
  onFinish: (profile: Profile) => void;
}

export function Onboarding({ onBack, onFinish }: OnboardingProps) {
  const [step, setStep] = React.useState(0);
  const [name, setName] = React.useState("");
  const [holdings, setHoldings] = React.useState<string[]>([]);
  const [tracking, setTracking] = React.useState<TrackId[]>(["stocks"]);
  const [dates, setDates] = React.useState<Record<string, DraftDate>>({});
  const [showDateErrors, setShowDateErrors] = React.useState(false);

  const pct = Math.round((step / STEPS.length) * 100);
  const current = STEPS[step];
  // Rows we know about (popular picks + anything chosen from search), keyed by symbol
  const [known, setKnown] = React.useState<Record<string, Stock>>({});
  React.useEffect(() => {
    getStocks(POPULAR)
      .then((rows) => setKnown((k) => ({ ...Object.fromEntries(rows.map((r) => [r.symbol, r])), ...k })))
      .catch(() => {});
  }, []);
  const topHolding = topByRevenue(holdings.map((h) => known[h]).filter((r): r is Stock => !!r));

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const checked = holdings.map((sym) => ({ sym, ...validateDraft(dates[sym] ?? EMPTY_DRAFT) }));
  const purchases = Object.fromEntries(
    checked.filter((c) => c.value).map((c) => [c.sym, c.value as PurchaseDate]),
  ) as Record<string, PurchaseDate>;

  // The purchase-date step only applies when at least one stock was picked.
  const go = (to: number) => {
    if (STEPS[to] === "purchased" && holdings.length === 0) to += to > step ? 1 : -1;
    setStep(to);
  };
  const next = () => {
    if (current === "purchased") {
      const bad = checked.find((c) => !c.value);
      if (bad) {
        setShowDateErrors(true);
        const e = bad.errors;
        document.getElementById(`buy-${bad.sym}-${e.month ? "month" : e.day ? "day" : "year"}`)?.focus();
        return;
      }
    }
    if (step < STEPS.length - 1) go(step + 1);
    else onFinish({ name: name.trim(), holdings, purchases, tracking });
  };
  const back = () => (step === 0 ? onBack() : go(step - 1));

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      aria-labelledby={`step-${current}`}
      className="mx-auto w-full max-w-xl rounded-[28px] border border-border/70 bg-card p-6 shadow-xl sm:p-10"
    >
      {/* Progress */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))` }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`Setup step ${step + 1} of ${STEPS.length}`}
      >
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={cn("h-1.5 rounded-full transition-colors duration-300", i <= step ? "bg-foreground" : "bg-secondary")}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-sm">
          Step {step + 1} of {STEPS.length} <span className="text-muted-foreground">· {pct}% ready</span>
        </p>
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 font-mono text-sm tabular-nums"
          aria-label={`${holdings.length} stocks selected`}
          title="Stocks selected"
        >
          <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
          {holdings.length}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {current === "name" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                next();
              }}
              id="step-form"
            >
              <StepHeading
                id="step-name"
                pill="Let’s get started"
                title="What’s your name?"
                sub="We’ll use it to greet you on your dashboard."
              />
              <div className="mt-8 space-y-2">
                <Label htmlFor="first-name">Your name</Label>
                <Input
                  id="first-name"
                  autoComplete="given-name"
                  autoFocus
                  placeholder="e.g. Alex"
                  maxLength={40}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 text-base"
                />
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  Preview: <span className="font-medium text-foreground">Hello, {name.trim() || "there"}</span>
                </p>
              </div>
            </form>
          )}

          {current === "holdings" && (
            <>
              <StepHeading
                id="step-holdings"
                pill="Your portfolio"
                title="What stocks do you already have?"
                sub="Search any listed company. Your largest by annual revenue leads the chart on your home screen."
              />
              <div className="mt-8">
                <StockSearch
                  size="lg"
                  label="Search for a company"
                  hideLabel={false}
                  placeholder="Company name or ticker"
                  selected={holdings}
                  onSelect={(s) => {
                    setKnown((k) => ({ ...k, [s.symbol]: s }));
                    setHoldings((h) => (h.includes(s.symbol) ? h : [...h, s.symbol]));
                  }}
                />

                {holdings.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-2" aria-label="Your stocks">
                    {holdings.map((sym) => (
                      <li key={sym}>
                        <button
                          type="button"
                          onClick={() => setHoldings((h) => h.filter((x) => x !== sym))}
                          aria-label={`Remove ${sym}`}
                          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-foreground py-1 pl-3 pr-2 font-mono text-sm font-medium text-background transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          {sym}
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mb-3 mt-8 flex items-baseline justify-between">
                  <span id="holdings-label" className="text-sm font-medium">
                    Popular
                  </span>
                  <span className="text-sm text-muted-foreground">(pick any)</span>
                </div>
                <div role="group" aria-labelledby="holdings-label" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {POPULAR.map((sym) => {
                    const on = holdings.includes(sym);
                    const s = known[sym];
                    return (
                      <button
                        key={sym}
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        aria-label={s ? `${sym}, ${s.name}` : sym}
                        onClick={() => setHoldings((h) => toggle(h, sym))}
                        className={cn(cardBase, cardState(on), "flex min-h-[80px] flex-col justify-between p-3.5")}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="font-mono text-base font-semibold tracking-tight">{sym}</span>
                          <CheckDot on={on} />
                        </span>
                        <span className="mt-2 line-clamp-1 text-xs leading-snug text-muted-foreground">
                          {s?.name ?? " "}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-4 min-h-[20px] text-sm text-muted-foreground" aria-live="polite">
                  {topHolding ? (
                    <>
                      Home chart: <span className="font-mono font-medium text-foreground">{topHolding.symbol}</span> ·{" "}
                      {formatRevenue(topHolding.revenue_usd)} revenue (FY{topHolding.revenue_fy})
                    </>
                  ) : holdings.length ? (
                    "None of these report revenue to the SEC yet, so your home chart will show your own revenue."
                  ) : (
                    "None yet? Skip ahead. Your home chart will show your own revenue."
                  )}
                </p>
              </div>
            </>
          )}

          {current === "purchased" && (
            <>
              <StepHeading
                id="step-purchased"
                pill="Your portfolio"
                title={holdings.length === 1 ? "When did you buy it?" : "When did you buy them?"}
                sub="Month and year are enough. Add the day if you know it."
              />
              <div className="mt-8 space-y-6">
                {checked.map(({ sym, errors }) => (
                  <PurchaseDateFields
                    key={sym}
                    idPrefix={`buy-${sym}`}
                    legend={
                      <span className="flex min-w-0 items-baseline gap-2">
                        <span className="font-mono font-semibold">{sym}</span>
                        <span className="truncate font-normal text-muted-foreground">{known[sym]?.name}</span>
                      </span>
                    }
                    value={dates[sym] ?? EMPTY_DRAFT}
                    onChange={(d) => setDates((all) => ({ ...all, [sym]: d }))}
                    errors={showDateErrors ? errors : undefined}
                  />
                ))}
              </div>
            </>
          )}

          {current === "tracking" && (
            <>
              <StepHeading
                id="step-tracking"
                pill="Smart setup"
                title="What are you tracking?"
                sub="Pick everything you manage. We’ll tune every page to it."
              />
              <div className="mt-8">
                <div className="mb-3 flex items-baseline justify-between">
                  <span id="tracking-label" className="text-sm font-medium">
                    Tracking
                  </span>
                  <span className="text-sm text-muted-foreground">(pick any)</span>
                </div>
                <div role="group" aria-labelledby="tracking-label" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {TRACK_OPTIONS.map((opt) => {
                    const on = tracking.includes(opt.id);
                    const icon = ICONS[opt.id];
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => setTracking((t) => toggle(t, opt.id))}
                        className={cn(cardBase, cardState(on), "flex flex-col items-start p-5")}
                      >
                        <span className="absolute right-4 top-4">
                          <CheckDot on={on} />
                        </span>
                        <span className={cn("flex h-16 w-16 items-center justify-center rounded-2xl", icon.tint)}>
                          <PixelIcon grid={icon.grid} palette={icon.palette} />
                        </span>
                        <span className="mt-5 text-lg font-medium">{opt.title}</span>
                        <span className="mt-1 text-sm text-muted-foreground">{opt.detail}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Footer */}
      <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
        <Button type="button" variant="outline" size="lg" className="rounded-xl bg-card" onClick={back}>
          Back
        </Button>
        {current === "name" ? (
          <Button type="submit" form="step-form" size="lg" className="rounded-xl">
            Continue
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            className="rounded-xl"
            disabled={current === "tracking" && tracking.length === 0}
            onClick={next}
          >
            {current === "tracking" ? "Finish" : "Continue"}
          </Button>
        )}
      </div>
    </motion.section>
  );
}
