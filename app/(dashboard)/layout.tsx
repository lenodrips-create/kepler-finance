import { SiteNav } from "@/components/site-nav";
import { Masthead } from "@/components/masthead";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      <div className="wrap">
        <Masthead />
      </div>
      <main className="wrap">
        {children}
        <p className="note">
          Companies: Nasdaq symbol directory. Revenue: SEC EDGAR filings. Prices: Yahoo Finance daily closes, delayed and cached
          up to 6 hours. News: Yahoo Finance, refreshed every 15 minutes. All cached in PostgreSQL. Net worth and personal revenue are
          sample data.
        </p>
      </main>
    </>
  );
}
