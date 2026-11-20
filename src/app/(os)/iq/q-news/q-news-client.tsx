"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Empty, ErrorBox, Head, Loading } from "../ui";

type Stream = "All" | "Angola" | "Lebanon" | "Global";
type NewsItem = {
  id: string;
  title: string;
  url: string;
  publisher: string;
  published_at: string | null;
  retrieved_at: string;
  category: string;
  geography: string;
  reliability: string;
  summary: string | null;
  impact: string | null;
};
type Source = { id: string; name: string; status: string; last_ok: string | null; last_error: string | null };
type Payload = { updatedAt: string; stream: string; items: NewsItem[]; sources: Source[] };

const STREAMS: Stream[] = ["All", "Angola", "Lebanon", "Global"];

function dateLabel(value: string | null) {
  if (!value) return "Publication time unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Publication time unavailable"
    : date.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Luanda" });
}

function age(value: string | null) {
  if (!value) return "Date unknown";
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "Recently indexed";
  const hours = Math.floor(ms / 3600000);
  return hours < 1 ? "Less than 1h ago" : hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

export default function QNewsClient() {
  const [stream, setStream] = useState<Stream>("All");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ stream, q: query });
      const response = await fetch(`/api/iq/q-news?${params.toString()}`, { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? `Q News returned ${response.status}`);
      setData(body as Payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load Q News.");
    } finally {
      setLoading(false);
    }
  }, [stream, query]);

  useEffect(() => { void load(); }, [load]);

  const refresh = async () => {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/iq/q-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stream })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok && body.status !== "partial") throw new Error(body.error ?? "News refresh failed.");
      const summary = Object.entries(body.results ?? {}).map(([name, result]) => {
        const value = result as { received?: number; stored?: number; error?: string };
        return value.error ? `${name}: ${value.error}` : `${name}: ${value.stored ?? 0} stored`;
      }).join(" · ");
      setNotice(summary || "Refresh completed.");
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "News refresh failed.");
    } finally {
      setBusy(false);
    }
  };

  const sources = data?.sources ?? [];
  const articles = data?.items ?? [];

  return (
    <>
      <Head title="Global Radar" desc="Global intelligence across Angola, Lebanon and the world. Headlines link to their publishers; GDELT is an index, not a verification service.">
        <button className="iq-btn pri" onClick={refresh} disabled={busy || loading}>
          {busy ? "Refreshing…" : `Refresh ${stream === "All" ? "all streams" : stream}`}
        </button>
      </Head>

      <div className="iq-disclaimer" style={{ marginBottom: 14 }}>
        Headlines are collected from GDELT-indexed publishers. Source reliability is unverified until independently reviewed. Publication dates and index retrieval times are shown separately.
      </div>

      <div className="iq-chips" role="tablist" aria-label="News stream" style={{ marginBottom: 12 }}>
        {STREAMS.map(item => (
          <button key={item} className={`iq-chip${stream === item ? " on" : ""}`} role="tab" aria-selected={stream === item} onClick={() => setStream(item)}>
            {item === "All" ? "All streams" : item}
          </button>
        ))}
      </div>

      <div className="iq-filters">
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search headlines" aria-label="Search headlines" />
        <span className="iq-sub" style={{ alignSelf: "center" }}>{articles.length} results · last 30 days</span>
      </div>

      {notice && <p className="iq-sub" role="status" style={{ margin: "0 0 12px" }}>{notice}</p>}
      {sources.length > 0 && (
        <div className="iq-tags" style={{ marginBottom: 14 }}>
          {sources.map(source => (
            <span key={source.id} className="iq-badge">
              {source.name.replace("GDELT · ", "")}: {source.status}
            </span>
          ))}
        </div>
      )}

      {loading && !data ? <Loading label="Loading intelligence…" /> :
        error ? <ErrorBox msg={error} retry={load} /> :
        articles.length === 0 ? <Empty>No headlines in this stream yet. Refresh to pull the latest indexed coverage.</Empty> :
        <ul className="iq-list iq-card">
          {articles.map(item => (
            <li key={item.id}>
              <article className="iq-row">
                <div>
                  <a className="t" href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a>
                  <div className="iq-tags">
                    <Badge kind="unverified" />
                    <Badge kind={item.category} />
                    <span className="iq-sub">{item.geography} · {item.publisher}</span>
                  </div>
                  <p className="iq-sub" style={{ margin: "7px 0 0" }}>
                    Published: {dateLabel(item.published_at)} · Indexed: {age(item.retrieved_at)}
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      }
    </>
  );
}
