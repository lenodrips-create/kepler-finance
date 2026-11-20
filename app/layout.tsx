import type { Metadata, Viewport } from "next";
// Fonts are bundled from npm (no Google Fonts download at build time, which made CI builds flaky).
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";
import "./dashboard.css";

export const metadata: Metadata = {
  title: { default: "Kepler Finance", template: "%s · Kepler Finance" },
  description: "Personal finance dashboard: stocks, investments and revenue.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
