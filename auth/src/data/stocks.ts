// Real US-listed companies, as they appear in Apple's Stocks app watchlists.
// `revenue` = annual revenue in $ billions for the fiscal year in `fy` (public filings).
// Keep in sync with the STOCKS list at the top of /app.js (the dashboard).
export interface StockInfo {
  t: string;
  n: string;
  revenue: number;
  fy: string;
}

export const STOCKS: StockInfo[] = [
  { t: "AAPL", n: "Apple Inc.", revenue: 391.0, fy: "FY2024" },
  { t: "MSFT", n: "Microsoft Corporation", revenue: 245.1, fy: "FY2024" },
  { t: "GOOGL", n: "Alphabet Inc.", revenue: 350.0, fy: "FY2024" },
  { t: "AMZN", n: "Amazon.com, Inc.", revenue: 638.0, fy: "FY2024" },
  { t: "NVDA", n: "NVIDIA Corporation", revenue: 130.5, fy: "FY2025" },
  { t: "META", n: "Meta Platforms, Inc.", revenue: 164.5, fy: "FY2024" },
  { t: "TSLA", n: "Tesla, Inc.", revenue: 97.7, fy: "FY2024" },
  { t: "NFLX", n: "Netflix, Inc.", revenue: 39.0, fy: "FY2024" },
  { t: "WMT", n: "Walmart Inc.", revenue: 681.0, fy: "FY2025" },
  { t: "BRK.B", n: "Berkshire Hathaway Inc.", revenue: 371.4, fy: "FY2024" },
  { t: "DIS", n: "The Walt Disney Company", revenue: 91.4, fy: "FY2024" },
  { t: "KO", n: "The Coca-Cola Company", revenue: 47.1, fy: "FY2024" },
];

export const PROFILE_KEY = "kepler.profile";

export interface Profile {
  name: string;
  holdings: string[];
  tracking: string[];
}
