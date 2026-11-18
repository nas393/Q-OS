# Command Center data push (`POST /api/ingest`)

The Command Center never shows invented numbers. Each business panel stays empty ("NO DATA YET") until a source project pushes real data here.

## Setup (one time)

1. In Vercel → q-os → Settings → Environment Variables, add `INGEST_TOKEN` (Production + Preview). Use a random string of 32+ characters.
2. Put the same token in each source project as a server-side secret (never `NEXT_PUBLIC_*`).
3. Redeploy q-os.

Without `INGEST_TOKEN` the endpoint returns `503 Ingest is not configured`.

## Request

```
POST https://<q-os-domain>/api/ingest
Authorization: Bearer <INGEST_TOKEN>
Content-Type: application/json

{
  "source": "counter-trader",
  "metrics": { "xauusd": { ... }, "links": [ ... ] }
}
```

Send any subset of keys. Each key replaces the previous value for that key. `source` is a lowercase slug shown under each panel with the push time.

## Keys

| Key | Shape | Panel |
|---|---|---|
| `kpis` | `[{label, value, delta?, trend?: "up"\|"down"\|"flat", progress?: 0-100}]` max 5 | Top KPI strip (falls back to live system KPIs) |
| `insights` | `[{title, detail?, trend?}]` max 4 | Q Intelligence |
| `alerts` | `[{title, level: "red"\|"amber", href?}]` max 6 | Alerts (added to live project alerts) |
| `agenda` | `[{time: "HH:MM", title}]` max 8 | Today's Agenda |
| `xauusd` | `{price, changePct, series:[numbers], timeframe?}` | Trading – XAU/USD |

Live source today: Counter-Trader → `xauusd`, `links`.

## Security

- Write-only: the endpoint never returns stored data.
- Token compared in constant time; failed attempts are written to `activity_logs`.
- Payloads are validated with zod; body limit 64 KB.
- Data is stored in table `command_metrics` (created automatically; see `database/migrations/0002_command_metrics.sql`).

## Links (`links`)

`[{label, url (https), note?}]` max 12. Shown under **Apps & Links**. Unlike other keys, links are stored **per source**, so each app keeps its own group. Push an empty array to remove an app's group.

The app tiles above the links come from the Vercel team (`GET /api/apps`, owner-only, read-only) and need no push.
