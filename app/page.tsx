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

  const rows = useMemo(() => {
    const filtered = (data.opportunities ?? []).filter(
      (o) => sport === "All" || o.sport === sport
    );
    return filtered.filter((o) => o.isArbitrage);
  }, [data.opportunities, sport]);

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <div className="eyebrow">LIVE SPORTSBOOK COMPARISON</div>
          <h1>Arbitrage Odds</h1>
          <p>
            Best available moneyline prices across major U.S. sportsbooks, ranked by
            positive arbitrage edge.
          </p>
        </div>
        <div className="controls">
          <button className="toggle" onClick={() => setFormat(format === "decimal" ? "american" : "decimal")}> 
            {format === "decimal" ? "Decimal Odds" : "American Odds"}
          </button>
          <button className="refresh" onClick={load} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh now"}
          </button>
        </div>
      </section>

      <section className="toolbar">
        <select value={sport} onChange={(e) => setSport(e.target.value)}>
          {sports.map((s) => <option key={s}>{s}</option>)}
        </select>
        <span className="updated">
          {data.updatedAt ? `Updated ${new Date(data.updatedAt).toLocaleTimeString()}` : "Live feed"}
        </span>
      </section>

      {data.error ? (
        <section className="notice">
          <strong>Live feed unavailable.</strong>
          <span>{data.error}</span>
        </section>
      ) : null}

      <section className="grid">
        {rows.map((row) => (
          <article className="card" key={row.id}>
            <div className="cardTop">
              <div>
                <span className="sport">{row.sport}</span>
                <h2>{row.matchup}</h2>
                <time>{new Date(row.commenceTime).toLocaleString()}</time>
              </div>
              <div className="edge">+{row.edge.toFixed(2)}%</div>
            </div>
            <div className="outcomes">
              {row.outcomes.map((outcome) => (
                <div className="outcome" key={outcome.name}>
                  <div>
                    <strong>{outcome.name}</strong>
                    <span>{outcome.bookmaker}</span>
                  </div>
                  <b>{format === "decimal" ? outcome.price.toFixed(2) : toAmerican(outcome.price)}</b>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      {!loading && !data.error && rows.length === 0 ? (
        <section className="empty">
          <h3>No live moneyline arbitrage currently meets the filter.</h3>
          <p>The feed refreshes automatically every 60 seconds.</p>
        </section>
      ) : null}

      <footer>
        Informational only. Odds change quickly; verify prices directly with the sportsbook before acting.
      </footer>
    </main>
  );
}
