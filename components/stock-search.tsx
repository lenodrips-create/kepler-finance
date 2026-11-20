"use client";

import * as React from "react";
import { Loader2, Search, X } from "lucide-react";
import { searchStocks, formatRevenue, type Stock } from "@/lib/stocks";
import { cn } from "@/lib/utils";

interface StockSearchProps {
  onSelect: (stock: Stock) => void;
  placeholder?: string;
  /** Visible label text (kept for screen readers when `hideLabel`). */
  label?: string;
  hideLabel?: boolean;
  size?: "sm" | "lg";
  autoFocus?: boolean;
  className?: string;
  /** Symbols to mark as already chosen in the results. */
  selected?: string[];
}

/**
 * Company search combobox (ARIA 1.2 pattern) backed by the search_stocks() Postgres function.
 * Arrow keys move through results, Enter picks, Escape closes.
 */
export function StockSearch({
  onSelect,
  placeholder = "Search companies or tickers",
  label = "Search stocks",
  hideLabel = true,
  size = "sm",
  autoFocus,
  className,
  selected = [],
}: StockSearchProps) {
  const id = React.useId();
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<Stock[]>([]);
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">("idle");
  const reqId = React.useRef(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults([]);
      setStatus("idle");
      return;
    }
    const mine = ++reqId.current;
    setStatus("loading");
    const t = setTimeout(async () => {
      try {
        const rows = await searchStocks(term, 8);
        if (mine !== reqId.current) return;
        setResults(rows);
        setActive(rows.length ? 0 : -1);
        setStatus("idle");
      } catch {
        if (mine === reqId.current) setStatus("error");
      }
    }, 160);
    return () => clearTimeout(t);
  }, [q]);

  const pick = (s: Stock) => {
    onSelect(s);
    setQ("");
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      if (open && results[active]) {
        e.preventDefault();
        pick(results[active]);
      }
    } else if (e.key === "Escape") {
      if (q) setQ("");
      setOpen(false);
    }
  };

  const showList = open && q.trim().length > 0;
  const listId = `${id}-list`;

  return (
    <div className={cn("relative", className)}>
      <label htmlFor={`${id}-input`} className={cn(hideLabel ? "sr-only" : "mb-2 block text-sm font-medium")}>
        {label}
      </label>
      <div className="relative">
        <Search
          className={cn("pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground", size === "lg" ? "left-4 h-5 w-5" : "left-3 h-4 w-4")}
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id={`${id}-input`}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && results[active] ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          className={cn(
            "w-full rounded-full border border-input bg-card text-foreground placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
            "[&::-webkit-search-cancel-button]:hidden",
            size === "lg" ? "h-14 pl-12 pr-12 text-base" : "h-11 pl-9 pr-9 text-base sm:text-sm",
          )}
        />
        {status === "loading" ? (
          <Loader2 className={cn("absolute top-1/2 -translate-y-1/2 animate-spin text-muted-foreground", size === "lg" ? "right-4 h-5 w-5" : "right-3 h-4 w-4")} aria-hidden="true" />
        ) : q ? (
          <button
            type="button"
            aria-label="Clear search"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setQ("");
              inputRef.current?.focus();
            }}
            className={cn("absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:text-foreground", size === "lg" ? "right-2 h-10 w-10" : "right-1 h-9 w-9")}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {showList && (
        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          <ul id={listId} role="listbox" aria-label="Matching stocks" className="max-h-[360px] overflow-y-auto py-1">
            {results.map((s, i) => {
              const chosen = selected.includes(s.symbol);
              return (
                <li
                  key={s.symbol}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseMove={() => i !== active && setActive(i)}
                  onClick={() => pick(s)}
                  className={cn("flex min-h-[44px] cursor-pointer items-center gap-3 px-4 py-2", i === active && "bg-secondary")}
                >
                  <span className="w-16 shrink-0 font-mono text-sm font-semibold">{s.symbol}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{s.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {s.exchange}
                      {s.is_etf ? " · ETF" : s.revenue_usd ? ` · ${formatRevenue(s.revenue_usd)} revenue` : ""}
                    </span>
                  </span>
                  {chosen && <span className="shrink-0 text-xs font-medium text-[#1E6B4F]">Added</span>}
                </li>
              );
            })}
          </ul>
          {status !== "loading" && results.length === 0 && (
            <p className="px-4 py-3 text-sm text-muted-foreground" role="status">
              {status === "error" ? "Search is unavailable right now. Try again in a moment." : `No stocks match “${q.trim()}”.`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
