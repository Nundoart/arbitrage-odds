import "./globals.css";

export const metadata = {
  title: "Arbitrage Odds",
  description: "Live sportsbook arbitrage comparison dashboard.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
