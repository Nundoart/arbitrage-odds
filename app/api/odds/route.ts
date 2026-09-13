import { NextResponse } from "next/server";

type Outcome = { name: string; price: number };
type Market = { key: string; outcomes: Outcome[] };
type Bookmaker = { key: string; title: string; markets: Market[] };
type Event = {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
};

const EXCLUDED = new Set(["mybookieag", "mybookie"]);

export async function GET() {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ODDS_API_KEY is not configured on the server." },
      { status: 503 }
    );
  }

  const url = new URL("https://api.the-odds-api.com/v4/sports/upcoming/odds/");
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("regions", "us,us2");
  url.searchParams.set("markets", "h2h");
  url.searchParams.set("oddsFormat", "decimal");
  url.searchParams.set("dateFormat", "iso");

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json(
      { error: `Odds provider error (${response.status})`, detail: text.slice(0, 500) },
      { status: 502 }
    );
  }

  const events = (await response.json()) as Event[];

  const opportunities = events
    .map((event) => {
      const best = new Map<string, { price: number; bookmaker: string }>();

      for (const bookmaker of event.bookmakers ?? []) {
        if (EXCLUDED.has(bookmaker.key.toLowerCase())) continue;
        const market = bookmaker.markets?.find((m) => m.key === "h2h");
        if (!market) continue;
        for (const outcome of market.outcomes ?? []) {
          if (!Number.isFinite(outcome.price) || outcome.price <= 1) continue;
          const current = best.get(outcome.name);
          if (!current || outcome.price > current.price) {
            best.set(outcome.name, {
              price: outcome.price,
              bookmaker: bookmaker.title,
            });
          }
        }
      }

      const outcomes = Array.from(best.entries()).map(([name, data]) => ({
        name,
        ...data,
      }));

      if (outcomes.length < 2) return null;
      const implied = outcomes.reduce((sum, o) => sum + 1 / o.price, 0);
      const edge = (1 - implied) * 100;

      return {
        id: event.id,
        sport: event.sport_title,
        commenceTime: event.commence_time,
        matchup: `${event.away_team} vs ${event.home_team}`,
        outcomes,
        implied,
        edge,
        isArbitrage: implied < 1,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.edge - a.edge);

  return NextResponse.json({
    updatedAt: new Date().toISOString(),
    opportunities,
  });
}
