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
          up to 6 hours (all stored in PostgreSQL). Net worth, personal revenue and headlines are sample data.
        </p>
      </main>
    </>
  );
}
