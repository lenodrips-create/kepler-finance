import * as React from "react";
import { motion } from "framer-motion";
import { Check, LayoutGrid, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// --------------------------------
// Pixel icons (12x12 grids; "." = transparent)
// --------------------------------

type Palette = Record<string, string>;

function PixelIcon({ grid, palette }: { grid: string[]; palette: Palette }) {
  const size = grid.length;
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="h-11 w-11"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
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

type OptionId = keyof typeof ICONS;

const OPTIONS: { id: OptionId; title: string; detail: string }[] = [
  { id: "stocks", title: "Stocks", detail: "Watchlists, prices, movers" },
  { id: "investments", title: "Investments", detail: "Portfolio, allocation, returns" },
  { id: "revenue", title: "Revenue", detail: "Income, invoices, growth" },
  { id: "savings", title: "Savings", detail: "Goals, budgets, cash" },
];

const TOTAL_STEPS = 4;
const STEP = 1;

// --------------------------------
// Onboarding
// --------------------------------

interface OnboardingProps {
  onBack: () => void;
  onContinue: (picks: OptionId[]) => void;
}

export function Onboarding({ onBack, onContinue }: OnboardingProps) {
  const [picks, setPicks] = React.useState<OptionId[]>(["stocks"]);
  const pct = Math.round((STEP / TOTAL_STEPS) * 100);

  const toggle = (id: OptionId) =>
    setPicks((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      aria-labelledby="onboarding-title"
      className="mx-auto w-full max-w-xl rounded-[28px] border border-border/70 bg-card p-6 shadow-xl sm:p-10"
    >
      {/* Progress */}
      <div
        className="grid grid-cols-4 gap-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Setup progress"
      >
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <span
            key={i}
            className={cn("h-1.5 rounded-full", i < STEP ? "bg-foreground" : "bg-secondary")}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-sm">
          {pct}% of your setup <span className="text-muted-foreground">ready</span>{" "}
          <Sparkles className="inline h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        </p>
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 font-mono text-sm tabular-nums"
          aria-label={`${picks.length} selected`}
        >
          <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
          {picks.length}
        </span>
      </div>

      {/* Heading */}
      <div className="mt-8 flex flex-col items-center text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Smart setup
        </span>
        <h1 id="onboarding-title" className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
          What are you tracking?
        </h1>
        <p className="mt-3 max-w-md text-base text-muted-foreground">
          Pick everything you manage. We’ll tune every page to it.
        </p>
      </div>

      {/* Options */}
      <div className="mt-8" role="group" aria-labelledby="tracking-label">
        <div className="mb-3 flex items-baseline justify-between">
          <span id="tracking-label" className="text-sm font-medium">Tracking</span>
          <span className="text-sm text-muted-foreground">(pick any)</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {OPTIONS.map((opt) => {
            const selected = picks.includes(opt.id);
            const icon = ICONS[opt.id];
            return (
              <button
                key={opt.id}
                type="button"
                role="checkbox"
                aria-checked={selected}
                onClick={() => toggle(opt.id)}
                className={cn(
                  "relative flex min-h-[44px] cursor-pointer flex-col items-start rounded-2xl border-2 p-5 text-left transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  selected
                    ? "border-foreground bg-card"
                    : "border-transparent bg-secondary/60 ring-1 ring-inset ring-border hover:bg-secondary",
                )}
              >
                <span
                  className={cn(
                    "absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors",
                    selected ? "border-foreground bg-foreground text-background" : "border-input bg-card",
                  )}
                  aria-hidden="true"
                >
                  {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
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

      {/* Footer */}
      <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
        <Button type="button" variant="outline" size="lg" className="rounded-xl bg-card" onClick={onBack}>
          Back
        </Button>
        <Button
          type="button"
          size="lg"
          className="rounded-xl"
          disabled={picks.length === 0}
          onClick={() => onContinue(picks)}
        >
          Continue
        </Button>
      </div>
    </motion.section>
  );
}
