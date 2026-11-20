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
          Company list and revenue: Nasdaq symbol directory and SEC EDGAR filings (PostgreSQL). Prices, personal figures and
          headlines are sample data.
        </p>
      </main>
    </>
  );
}
