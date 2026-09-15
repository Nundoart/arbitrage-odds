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
const REFRESH_SECONDS = 300;

export const revalidate = 300;

function cleanApiKey(value?: string) {
  return value?.trim().replace(/^["']|["']$/g, "");
}

export async function GET() {
  const apiKey = cleanApiKey(process.env.ODDS_API_KEY ?? process.env.THE_ODDS_API_KEY);
  if (!apiKey) {
    return NextResponse.json(
      { error: "Live odds feed is not configured." },
      { status: 503 }
    );
  }

  try {
    const url = new URL("https://api.the-odds-api.com/v4/sports/upcoming/odds/");
    url.searchParams.set("apiKey", apiKey);
    url.searchParams.set("regions", "us,us2");
    url.searchParams.set("markets", "h2h");
    url.searchParams.set("oddsFormat", "decimal");
    url.searchParams.set("dateFormat", "iso");

    const response = await fetch(url, {
      next: { revalidate: REFRESH_SECONDS },
    });

    if (!response.ok) {
      const detail = await response.text();
      const quotaReached =
        response.status === 401 &&
        /quota|credit|usage|out.of.usage/i.test(detail);

      return NextResponse.json(
        {
          error: quotaReached
            ? "Live odds allowance reached. The feed will resume when provider credits renew."
            : response.status === 401
              ? "The live odds connection needs a refreshed provider key."
              : "Live odds are temporarily unavailable.",
        },
        {
          status: quotaReached ? 429 : 502,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) {
      return NextResponse.json(
        { error: "Odds provider returned an unexpected response." },
        { status: 502 }
      );
    }

    const opportunities = (payload as Event[])
      .map((event) => {
        const best = new Map<string, { price: number; bookmaker: string }>();

        for (const bookmaker of event.bookmakers ?? []) {
          if (EXCLUDED.has(bookmaker.key.toLowerCase())) continue;
          const market = bookmaker.markets?.find((item) => item.key === "h2h");
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
        const implied = outcomes.reduce((sum, outcome) => sum + 1 / outcome.price, 0);
        if (!Number.isFinite(implied) || implied <= 0) return null;

        return {
          id: event.id,
          sport: event.sport_title,
          commenceTime: event.commence_time,
          matchup: `${event.away_team} vs ${event.home_team}`,
          outcomes,
          implied,
          edge: (1 / implied - 1) * 100,
          isArbitrage: implied < 1,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.edge - a.edge);

    return NextResponse.json(
      {
        updatedAt: new Date().toISOString(),
        opportunities,
      },
      {
        headers: {
          "Cache-Control": `s-maxage=${REFRESH_SECONDS}, stale-while-revalidate=60`,
        },
      }
    );
  } catch (error) {
    console.error("Odds API route failed", error);
    return NextResponse.json(
      { error: "Unable to load live odds right now." },
      { status: 502 }
    );
  }
}
