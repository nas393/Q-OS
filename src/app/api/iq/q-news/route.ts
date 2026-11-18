import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import { readSession } from "@/lib/session";
import { jsonError, requestOriginAllowed } from "@/lib/http";
import { Q_NEWS_STREAMS, classifyNewsCategory, normalizeNewsTitle, parseGdeltDate, validArticleUrl, type GdeltArticle, type QNewsStream } from "@/lib/q-news";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STREAMS = Object.keys(Q_NEWS_STREAMS) as QNewsStream[];
const SOURCE_ENDPOINT = "https://api.gdeltproject.org/api/v2/doc/doc";
const isStream = (value: unknown): value is QNewsStream => typeof value === "string" && STREAMS.includes(value as QNewsStream);

async function ensureSource(stream: QNewsStream) {
  const source = Q_NEWS_STREAMS[stream];
  await getDb().query(
    `INSERT INTO iq_sources (id,name,kind,url,trust,status,last_run)
     VALUES ($1,$2,'news-index',$3,'unverified','not_run',now())
     ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,kind=EXCLUDED.kind,url=EXCLUDED.url`,
    [source.sourceId, source.sourceName, SOURCE_ENDPOINT]
  );
}

async function refreshStream(stream: QNewsStream): Promise<{ received: number; stored: number }> {
  const source = Q_NEWS_STREAMS[stream];
  await ensureSource(stream);
  const url = new URL(SOURCE_ENDPOINT);
  url.searchParams.set("query", source.query);
  url.searchParams.set("mode", "ArtList");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", "50");
  url.searchParams.set("sort", "HybridRel");
  url.searchParams.set("timespan", "7d");

  try {
    const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(18000) });
    if (!response.ok) throw new Error(`GDELT returned HTTP ${response.status}`);
    const payload = await response.json() as { articles?: GdeltArticle[] };
    const articles = Array.isArray(payload.articles) ? payload.articles : [];
    let stored = 0;

    for (const article of articles) {
      const title = typeof article.title === "string" ? article.title.trim().slice(0, 500) : "";
      const articleUrl = validArticleUrl(article.url);
      if (!title || !articleUrl) continue;
      const publisher = (article.domain || new URL(articleUrl).hostname).slice(0, 180);
      await getDb().query(
        `INSERT INTO iq_items
          (source_id,title,url,publisher,published_at,retrieved_at,category,geography,reliability,facts,raw,title_key)
         VALUES ($1,$2,$3,$4,$5,now(),$6,$7,'unverified','[]'::jsonb,$8::jsonb,$9)
         ON CONFLICT (url) DO UPDATE SET
          source_id=EXCLUDED.source_id,title=EXCLUDED.title,publisher=EXCLUDED.publisher,
          published_at=COALESCE(EXCLUDED.published_at,iq_items.published_at),retrieved_at=now(),
          category=EXCLUDED.category,geography=EXCLUDED.geography,raw=EXCLUDED.raw,title_key=EXCLUDED.title_key`,
        [source.sourceId,title,articleUrl,publisher,parseGdeltDate(article.seendate),classifyNewsCategory(title),stream,JSON.stringify(article),normalizeNewsTitle(title)]
      );
      stored += 1;
    }
    await getDb().query("UPDATE iq_sources SET status='operational',last_ok=now(),last_run=now(),last_error=NULL WHERE id=$1",[source.sourceId]);
    return { received: articles.length, stored };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "News source request failed";
    await getDb().query("UPDATE iq_sources SET status='degraded',last_run=now(),last_error=$2 WHERE id=$1",[source.sourceId,message]).catch(() => {});
    throw new Error(`${stream}: ${message}`);
  }
}

export async function GET(request: Request) {
  if (!await readSession()) return jsonError(401, "Unauthorized");
  try {
    await ensureSchema();
    const params = new URL(request.url).searchParams;
    const selected = params.get("stream") ?? "All";
    const stream = selected === "All" || isStream(selected) ? selected : "All";
    const search = (params.get("q") ?? "").trim().slice(0, 120);
    const geographies = stream === "All" ? STREAMS : [stream];
    const result = await getDb().query(
      `SELECT id,title,url,publisher,published_at,retrieved_at,category,geography,reliability,summary,impact
       FROM iq_items WHERE geography = ANY($1::text[])
       AND retrieved_at >= now() - interval '30 days'
       AND ($2 = '' OR title ILIKE '%' || $2 || '%')
       ORDER BY COALESCE(published_at,retrieved_at) DESC LIMIT 150`,
      [geographies,search]
    );
    const sources = await getDb().query(
      "SELECT id,name,status,last_ok,last_error FROM iq_sources WHERE id = ANY($1::text[]) ORDER BY name",
      [STREAMS.map(name => Q_NEWS_STREAMS[name].sourceId)]
    );
    return NextResponse.json({updatedAt:new Date().toISOString(),stream,items:result.rows,sources:sources.rows},{headers:{"Cache-Control":"no-store"}});
  } catch (error) {
    console.error("q_news_read_failed",{name:error instanceof Error?error.name:"unknown"});
    return jsonError(503,"Q News is temporarily unavailable.");
  }
}

export async function POST(request: Request) {
  if (!await readSession()) return jsonError(401, "Unauthorized");
  if (!requestOriginAllowed(request)) return jsonError(403, "Request origin rejected");
  const body = await request.json().catch(() => ({})) as {stream?:unknown};
  const streams = body.stream === undefined || body.stream === "All" ? STREAMS : isStream(body.stream) ? [body.stream] : null;
  if (!streams) return jsonError(400,"Choose Angola, Lebanon, Global or All.");
  try { await ensureSchema(); } catch { return jsonError(503,"Q News storage is not ready."); }

  const results: Record<string,{received:number;stored:number}|{error:string}> = {};
  await Promise.all(streams.map(async stream => {
    try { results[stream] = await refreshStream(stream); }
    catch (error) { results[stream] = {error:error instanceof Error?error.message:"Refresh failed"}; }
  }));
  const failed = Object.values(results).filter(result => "error" in result).length;
  return NextResponse.json({results,status:failed===streams.length?"failed":failed?"partial":"ok"},
    {status:failed===streams.length?502:200,headers:{"Cache-Control":"no-store"}});
}
