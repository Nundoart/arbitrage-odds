"use client";

import { useEffect, useMemo, useState } from "react";

type Outcome = { name: string; price: number; bookmaker: string };
type Opportunity = { id: string; sport: string; commenceTime: string; matchup: string; outcomes: Outcome[]; edge: number; isArbitrage: boolean };
type Payload = { updatedAt?: string; opportunities?: Opportunity[]; error?: string };

function toAmerican(decimal: number) {
  return decimal >= 2 ? `+${Math.round((decimal - 1) * 100)}` : `${Math.round(-100 / (decimal - 1))}`;
}
function displayOdds(price: number, format: "decimal" | "american") {
  return format === "american" ? toAmerican(price) : price.toFixed(2);
}
function displayTime(value?: string) {
  if (!value) return "Checking…";
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export default function Home() {
  const [data, setData] = useState<Payload>({});
  const [loading, setLoading] = useState(true);
  const [format, setFormat] = useState<"decimal" | "american">("american");
  const [sport, setSport] = useState("All");
  const [minimumEdge, setMinimumEdge] = useState(0.5);
  const [viewCount, setViewCount] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/odds");
      setData(await response.json());
    } catch {
      setData({ error: "Unable to load odds right now." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetch("https://faarsnowvezfwdrthjfe.supabase.co/rest/v1/rpc/increment_site_view", { method: "POST", headers: { apikey: "sb_publishable_tDb1evEClQ9bvIejK9L-DA_ThnNQRdr", "content-type": "application/json" }, body: JSON.stringify({ p_site_key: "arbitrage-odds" }) })
      .then((response) => response.ok ? response.json() : null)
      .then((rows) => setViewCount(rows?.[0]?.total ?? null))
      .catch(() => undefined);
    load();
    const interval = window.setInterval(load, 300_000);
    return () => window.clearInterval(interval);
  }, []);

  const sports = useMemo(() => ["All", ...Array.from(new Set((data.opportunities ?? []).map((item) => item.sport))).sort()], [data.opportunities]);
  const rows = useMemo(() => (data.opportunities ?? []).filter((item) => item.isArbitrage && (sport === "All" || item.sport === sport) && item.edge >= minimumEdge), [data.opportunities, sport, minimumEdge]);

  return <main className="pageShell"><section className="appFrame">
    <header className="topbar"><div className="brandWrap"><div className="brandMark">A</div><div><div className="brand">ARBITRAGE ODDS</div><div className="tagline">Live market gaps, clearly compared.</div></div></div><div className="liveStatus"><span className="liveDot" /> Live · checks every 5 min</div></header>
    <section className="heroPanel"><div><p className="kicker">LIVE OPPORTUNITY SCANNER</p><h1>Compare the market before it moves.</h1></div><div className="lastChecked">Last checked <strong>{displayTime(data.updatedAt)}</strong></div></section>
    <section className="controlBar" aria-label="Opportunity filters">
      <label className="filterGroup"><span>SPORT</span><select value={sport} onChange={(event) => setSport(event.target.value)}>{sports.map((item) => <option key={item} value={item}>{item === "All" ? "All sports" : item}</option>)}</select></label>
      <label className="rangeGroup"><span>MINIMUM EDGE <b>{minimumEdge.toFixed(1)}%</b></span><input aria-label="Minimum edge" type="range" min="0" max="10" step="0.1" value={minimumEdge} onChange={(event) => setMinimumEdge(Number(event.target.value))} /></label>
      <div className="formatGroup"><span>ODDS FORMAT</span><div className="segmented"><button className={format === "american" ? "active" : ""} onClick={() => setFormat("american")}>American</button><button className={format === "decimal" ? "active" : ""} onClick={() => setFormat("decimal")}>Decimal</button></div></div>
    </section>
    <section className="tableCard" aria-live="polite"><div className="tableHead"><span>MATCHUP / MARKET</span><span>STARTS</span><span>BEST SIDE A</span><span>BEST SIDE B</span><span>ARB EDGE</span></div>
      {rows.map((row) => <article className="opportunityRow" key={row.id}><div className="matchup"><strong>{row.matchup}</strong><span>{row.sport} · Moneyline</span></div><time>{new Intl.DateTimeFormat("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(row.commenceTime))}</time>{row.outcomes.slice(0, 2).map((outcome) => <div className="bestSide" key={outcome.name}><strong>{outcome.name} · {outcome.bookmaker}</strong><b>{displayOdds(outcome.price, format)}</b></div>)}<div className="edgeBadge">+{row.edge.toFixed(1)}%</div></article>)}
      {!loading && !data.error && rows.length === 0 && <div className="emptyState">No live moneyline arbitrage currently meets your filters. The scanner keeps checking automatically.</div>}{data.error && <div className="emptyState errorState">{data.error} <button onClick={load}>Try again</button></div>}{loading && rows.length === 0 && <div className="emptyState">Scanning current sportsbook prices…</div>}
    </section>
    <footer className="siteCounter">Site views <b>{viewCount?.toLocaleString() ?? "—"}</b></footer>
  </section></main>;
}