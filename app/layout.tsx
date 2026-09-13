import "./globals.css";
import type { Metadata } from "next";

const siteUrl = "https://arbitrage-odds-ivory.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Arbitrage Odds | Live Sportsbook Arbitrage Scanner",
  description: "Compare live sportsbook moneyline prices, find market gaps, and monitor arbitrage opportunities across major sports books.",
  keywords: ["sportsbook arbitrage", "arbitrage odds", "sports betting odds comparison", "moneyline odds", "live odds scanner"],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "Arbitrage Odds | Live Sportsbook Arbitrage Scanner",
    description: "Compare live sportsbook moneyline prices and discover market gaps in one clean scanner.",
    siteName: "Arbitrage Odds",
  },
  twitter: {
    card: "summary",
    title: "Arbitrage Odds | Live Sportsbook Arbitrage Scanner",
    description: "Compare live sportsbook moneyline prices and discover market gaps in one clean scanner.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}