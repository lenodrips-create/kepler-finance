"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { StockSearch } from "@/components/stock-search";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/stocks/", label: "Stocks" },
  { href: "/investments/", label: "Investments" },
  { href: "/revenue/", label: "Revenue" },
];

export function SiteNav() {
  const pathname = usePathname();
  const router = useRouter();
  const norm = (p: string) => (p.endsWith("/") ? p : p + "/");

  return (
    <nav aria-label="Main">
      <div className="wrap bar">
        <ul>
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} aria-current={norm(pathname) === norm(l.href) ? "page" : undefined}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="nav-search py-2">
          <StockSearch onSelect={(s) => router.push(`/stocks/?s=${encodeURIComponent(s.symbol)}`)} />
        </div>
        <Link className="profile" href="/login/" aria-label="Sign in" title="Sign in">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8.5" r="3.75" />
            <path d="M4.5 20c1.2-3.6 4.1-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
          </svg>
        </Link>
      </div>
    </nav>
  );
}
