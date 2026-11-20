"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase";
import type { PurchaseDate } from "@/lib/purchase";

/** Real market data from the stock_quote() Postgres function (Yahoo Finance daily closes, cached 6h). */
export interface Quote {
  symbol: string;
  price: number;
  as_of: string | null;
  prev_close: number | null;
  lo52: number;
  hi52: number;
  spark: number[]; // last 30 daily closes
  months: string[]; // last 12 month labels
  monthly: number[]; // month-end closes
}

export const dayChange = (q: Quote) => (q.prev_close ? ((q.price - q.prev_close) / q.prev_close) * 100 : 0);

const quoteCache = new Map<string, Promise<Quote | null>>();
export function getQuote(symbol: string): Promise<Quote | null> {
  let p = quoteCache.get(symbol);
  if (!p) {
    p = Promise.resolve(supabase.rpc("stock_quote", { sym: symbol })).then(({ data, error }) => {
      if (error) throw error;
      const q = data as Quote | null;
      if (!q || typeof q !== "object" || typeof q.price !== "number" || !q.price) return null;
      // End the month-end series on the live price (the latest daily bar can lag it).
      if (q.monthly?.length) q.monthly[q.monthly.length - 1] = q.price;
      return q;
    });
    p.catch(() => quoteCache.delete(symbol)); // allow retry after a network error
    quoteCache.set(symbol, p);
  }
  return p;
}

/** symbol -> Quote (loaded), null (no price data), undefined (loading). */
export function useQuotes(symbols: string[]): Record<string, Quote | null | undefined> {
  const [quotes, setQuotes] = React.useState<Record<string, Quote | null>>({});
  const key = symbols.join(",");
  React.useEffect(() => {
    let live = true;
    symbols.forEach((s) =>
      getQuote(s)
        .then((q) => live && setQuotes((all) => ({ ...all, [s]: q })))
        .catch(() => live && setQuotes((all) => ({ ...all, [s]: null }))),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return quotes;
}

export const isoDate = (p: PurchaseDate) =>
  `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day ?? 1).padStart(2, "0")}`;

export interface BuyPrice {
  date: string; // trading day used
  close: number;
}

const buyCache = new Map<string, Promise<BuyPrice | null>>();
/** Closing price on the purchase day (or the first trading day of the month when no day was given). */
export function getBuyPrice(symbol: string, p: PurchaseDate): Promise<BuyPrice | null> {
  const k = `${symbol}@${isoDate(p)}`;
  let pr = buyCache.get(k);
  if (!pr) {
    pr = Promise.resolve(supabase.rpc("price_on", { sym: symbol, on_date: isoDate(p) })).then(({ data, error }) => {
      if (error) throw error;
      const b = data as BuyPrice | null;
      return b && typeof b === "object" && typeof b.close === "number" && b.close > 0 ? b : null;
    });
    pr.catch(() => buyCache.delete(k));
    buyCache.set(k, pr);
  }
  return pr;
}

export interface Position {
  symbol: string;
  purchase?: PurchaseDate;
  buy?: BuyPrice | null; // undefined = loading
  quote?: Quote | null;
  /** % change in share price since purchase (split-adjusted; excludes dividends). */
  returnPct?: number;
  invested?: number;
  value?: number;
  gain?: number;
}

/** Combines purchase dates/amounts with real prices into per-stock gains. */
export function usePositions(holdings: string[], purchases: Record<string, PurchaseDate>): Position[] {
  const quotes = useQuotes(holdings);
  const [buys, setBuys] = React.useState<Record<string, BuyPrice | null>>({});
  const key = holdings.map((h) => `${h}@${purchases[h] ? isoDate(purchases[h]) : ""}`).join(",");
  React.useEffect(() => {
    let live = true;
    holdings.forEach((h) => {
      const p = purchases[h];
      if (!p) return;
      getBuyPrice(h, p)
        .then((b) => live && setBuys((all) => ({ ...all, [`${h}@${isoDate(p)}`]: b })))
        .catch(() => live && setBuys((all) => ({ ...all, [`${h}@${isoDate(p)}`]: null })));
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return holdings.map((symbol) => {
    const purchase = purchases[symbol];
    const quote = quotes[symbol];
    const buy = purchase ? buys[`${symbol}@${isoDate(purchase)}`] : null;
    const pos: Position = { symbol, purchase, buy, quote };
    if (quote && buy) {
      pos.returnPct = (quote.price / buy.close - 1) * 100;
      if (purchase?.amount) {
        pos.invested = purchase.amount;
        pos.value = (purchase.amount / buy.close) * quote.price;
        pos.gain = pos.value - purchase.amount;
      }
    }
    return pos;
  });
}

export const usd = (n: number, digits = 2) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits });
export const signedUsd = (n: number, digits = 2) => (n >= 0 ? "+" : "−") + usd(Math.abs(n), digits);
