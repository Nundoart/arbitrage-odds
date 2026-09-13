"use client";

import { useEffect, useMemo, useState } from "react";

type Outcome = { name: string; price: number; bookmaker: string };
type Opportunity = {
  id: string;
  sport: string;
  commenceTime: string;
  matchup: string;
  outcomes: Outcome[];
  implied: number;
  edge: number;
  isArbitrage: boolean;
};

type Payload = {
  updatedAt?: string;
  opportunities?: Opportunity[];
  error?: string;
};

function toAmerican(decimal: number) {
  if (decimal >= 2) return `+${Math.round((decimal - 1) * 100)}`;
  return `${Math.round(-100 / (decimal - 1))}`;
}

function formatOdds(price: number, format: "decimal" | "american") {
  return format === "decimal" ? price.toFixed(2) : toAmerican(price);
}

export default function Home() {
  const [data, setData] = useState<Payload>({});
  const [loading, setLoading] = useState(true);
  const [format, setFormat] = useState<"decimal" | "american">("decimal");
  const [sport, setSport] = useState("All");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/odds", { cache: "no-store" });
      const json = await res.json();
      setData(json);
    } catch {
      setData({ error: "Unable to load odds right now." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  const sports = useMemo(() => {
    const unique = new Set((data.opportunities ?? []).map((o) => o.sport));
    return ["All", ...Array.from(unique).sort()];
  }, [data.opportunities]);

  const allRows = useMemo(() => {
    return (data.opportunities ?? []).filter((o) => sport === "All" || o.sport === sport);
  }, [data.opportunities, sport]);

  const rows = useMemo(() => allRows.filter((o) => o.isArbitrage), [allRows]);

  const books = useMemo(() => {
    return Array.from(
      new Set((data.opportunities ?? []).flatMap((o) => o.outcomes.map((x) => x.bookmaker)))
    ).slice(0, 20);
  }, [data.opportunities]);

  const bestEdge = rows.length ? Math.max(...rows.map((r) => r.edge)) : 0;

  return (
    <main className="pageShell">
      <header className="topbar">
        <div className="brandWrap">
          <div className="brandMark">AO</div>
          <div>
            <div className="brand">ARBITRAGE ODDS</div>
            <div className="tagline">Live sportsbook price scanner</div>
          </div>
        </div>
        <div className="livePill"><span className="liveDot" /> LIVE</div>
      </header>

      <section className="heroPanel">
        <div className="heroCopy">
          <div className="kicker">FIND THE GAP. LOCK THE EDGE.</div>
          <h1>Live arbitrage opportunities across major sportsbooks.</h1>
          <p>
            We compare moneyline prices, surface the best number on each side, and flag
            mathematically positive arbitrage opportunities as they appear.
          </p>
        </div>
        <div className="heroStats">
          <div className="statCard"><span>Sports tracked</span><strong>{Math.max(sports.length - 1, 0)}</strong></div>
          <div className="statCard"><span>Sportsbooks seen</span><strong>{books.length}</strong></div>
          <div className="statCard"><span>Live arbs</span><strong>{rows.length}</strong></div>
          <div className="statCard"><span>Best edge</span><strong>{bestEdge > 0 ? `+${bestEdge.toFixed(2)}%` : "—"}</strong></div>
        </div>
      </section>

      <section className="controlBar">
        <div className="filterGroup">
          <label>SPORT</label>
          <select value={sport} onChange={(e) => setSport(e.target.value)}>
            {sports.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="segmented" aria-label="Odds format">
          <button className={format === "american" ? "active" : ""} onClick={() => setFormat("american")}>American</button>
          <button className={format === "decimal" ? "active" : ""} onClick={() => setFormat("decimal")}>Decimal</button>
        </div>

        <button className="refreshButton" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh odds"}
        </button>
      </section>

      <section className="bookStrip">
        <span className="bookStripLabel">TRACKING</span>
        <div className="bookScroller">
          {(books.length ? books : ["DraftKings", "FanDuel", "BetMGM", "Caesars", "Fanatics", "bet365"]).map((book) => (
            <span className="bookChip" key={book}>{book}</span>
          ))}
        </div>
      </section>

      <section className="sectionHeading">
        <div>
          <span className="sectionEyebrow">CURRENT OPPORTUNITIES</span>
          <h2>Live moneyline arbitrage</h2>
        </div>
        <div className="updatedText">
          {data.updatedAt ? `Updated ${new Date(data.updatedAt).toLocaleTimeString()}` : "Waiting for live feed"}
        </div>
      </section>

      {data.error ? (
        <section className="notice danger">
          <div className="noticeIcon">!</div>
          <div><strong>Live feed unavailable</strong><span>{data.error}</span></div>
          <button onClick={load}>Try again</button>
        </section>
      ) : null}

      <section className="arbGrid">
        {rows.map((row) => (
          <article className="arbCard" key={row.id}>
            <div className="arbHeader">
              <div>
                <span className="sportBadge">{row.sport}</span>
                <h3>{row.matchup}</h3>
                <time>{new Date(row.commenceTime).toLocaleString()}</time>
              </div>
              <div className="edgeBadge"><small>ARB EDGE</small><strong>+{row.edge.toFixed(2)}%</strong></div>
            </div>

            <div className="outcomeTable">
              <div className="tableHead"><span>Outcome</span><span>Best sportsbook</span><span>Odds</span></div>
              {row.outcomes.map((outcome) => (
                <div className="outcomeRow" key={outcome.name}>
                  <strong>{outcome.name}</strong>
                  <span className="bookName">{outcome.bookmaker}</span>
                  <b>{formatOdds(outcome.price, format)}</b>
                </div>
              ))}
            </div>

            <div className="arbFooter">
              <span>Implied total {(row.implied * 100).toFixed(2)}%</span>
              <span>Prices refresh automatically every 60 sec</span>
            </div>
          </article>
        ))}
      </section>

      {!loading && !data.error && rows.length === 0 ? (
        <section className="emptyState">
          <div className="emptyIcon">↻</div>
          <h3>No live moneyline arbitrage currently meets your filters.</h3>
          <p>That is normal. The scanner keeps checking and refreshes automatically every 60 seconds.</p>
          <button onClick={load}>Check again</button>
        </section>
      ) : null}

      <footer className="siteFooter">
        <div>
          <strong>ARBITRAGE ODDS</strong>
          <span>Informational sportsbook comparison only.</span>
        </div>
        <p>Odds can move at any moment. Always verify current prices directly with the sportsbook.</p>
      </footer>
    </main>
  );
}
