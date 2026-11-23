import {getDb} from "@/lib/db";

/*
 * NASSIM OS schema, versioned. Each migration runs once, in order, and is recorded in schema_migrations.
 * A transaction-level advisory lock stops two server instances migrating at the same time.
 * Rules: add new migrations at the end; never edit or reorder applied ones; additive changes only.
 * (Stage 1 core tables are in database/migrations/0001-0002 and were applied by hand.)
 */
type Migration={id:number;name:string;sql:string};
export const MIGRATIONS:Migration[]=[
 {id:1,name:"runtime_tables_v1",sql:`
CREATE TABLE IF NOT EXISTS q_kv (k text PRIMARY KEY, v jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS q_push_subs (endpoint text PRIMARY KEY, sub jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS q_alerts (id bigserial PRIMARY KEY, level text NOT NULL, title text NOT NULL, body text NOT NULL DEFAULT '', url text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS q_alert_state (key text PRIMARY KEY, status text NOT NULL, fails int NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS q_check_runs (id bigserial PRIMARY KEY, at timestamptz NOT NULL DEFAULT now(), ms int NOT NULL DEFAULT 0, events jsonb NOT NULL DEFAULT '[]', errors jsonb NOT NULL DEFAULT '[]');
CREATE TABLE IF NOT EXISTS q_gold_rules (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), direction text NOT NULL CHECK (direction IN ('above','below')), price numeric NOT NULL, active boolean NOT NULL DEFAULT true, fired_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS q_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  project text,
  due_date date,
  due_time text CHECK (due_time IS NULL OR due_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  done_at timestamptz);
CREATE TABLE IF NOT EXISTS command_metrics (
    metric_key text PRIMARY KEY,
    payload jsonb NOT NULL,
    source text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  );
CREATE TABLE IF NOT EXISTS iq_sources (id text PRIMARY KEY, name text NOT NULL, kind text NOT NULL, url text, trust text NOT NULL DEFAULT 'trusted', status text NOT NULL DEFAULT 'not_run', last_ok timestamptz, last_error text, last_run timestamptz, config_needed text);
CREATE TABLE IF NOT EXISTS iq_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_id text REFERENCES iq_sources(id), title text NOT NULL, summary text, url text UNIQUE, publisher text, published_at timestamptz, retrieved_at timestamptz NOT NULL DEFAULT now(), category text NOT NULL DEFAULT 'economy', geography text NOT NULL DEFAULT 'Angola', impact text, reliability text NOT NULL DEFAULT 'unverified', confidence text, facts jsonb NOT NULL DEFAULT '[]', reviewed boolean NOT NULL DEFAULT false, notes text, title_key text);
ALTER TABLE iq_items ADD COLUMN IF NOT EXISTS raw jsonb NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS iq_items_pub ON iq_items(published_at DESC);
CREATE INDEX IF NOT EXISTS iq_items_titlekey ON iq_items(title_key);
CREATE TABLE IF NOT EXISTS iq_obs (id bigserial PRIMARY KEY, indicator text NOT NULL, value numeric NOT NULL, unit text NOT NULL, period text NOT NULL, geography text NOT NULL DEFAULT 'Angola', source_id text REFERENCES iq_sources(id), source_url text, retrieved_at timestamptz NOT NULL DEFAULT now(), meta jsonb NOT NULL DEFAULT '{}', UNIQUE(indicator,period,geography,source_id));
CREATE TABLE IF NOT EXISTS iq_analyses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL, title text NOT NULL, input jsonb NOT NULL DEFAULT '{}', output jsonb NOT NULL DEFAULT '{}', provider text, model text, parent_id uuid REFERENCES iq_analyses(id) ON DELETE SET NULL, version int NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS iq_analyses_kind ON iq_analyses(kind, created_at DESC);
CREATE TABLE IF NOT EXISTS iq_projects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, description text, sector text, geography text, status text NOT NULL DEFAULT 'idea' CHECK (status IN ('idea','researching','compliance','active','paused','abandoned','completed')), investment text, target_date date, expected_outcome text, notes text, milestones jsonb NOT NULL DEFAULT '[]', analysis_ids uuid[] NOT NULL DEFAULT '{}', item_ids uuid[] NOT NULL DEFAULT '{}', history jsonb NOT NULL DEFAULT '[]', archived boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS iq_saved (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL, ref_id text, title text NOT NULL, url text, notes text, tags text[] NOT NULL DEFAULT '{}', archived boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(kind,ref_id));
CREATE TABLE IF NOT EXISTS iq_watch (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), keyword text NOT NULL, category text NOT NULL DEFAULT 'all', frequency text NOT NULL DEFAULT 'instant' CHECK (frequency IN ('instant','daily','weekly')), priority text NOT NULL DEFAULT 'normal', active boolean NOT NULL DEFAULT true, match_count int NOT NULL DEFAULT 0, last_triggered timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS iq_watch_hits (watch_id uuid REFERENCES iq_watch(id) ON DELETE CASCADE, item_id uuid REFERENCES iq_items(id) ON DELETE CASCADE, notified boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(watch_id,item_id));
CREATE TABLE IF NOT EXISTS iq_locations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, category text NOT NULL, province text, lat double precision NOT NULL CHECK (lat BETWEEN -19 AND -4), lng double precision NOT NULL CHECK (lng BETWEEN 11 AND 25), source text NOT NULL, source_url text, verified boolean NOT NULL DEFAULT false, notes text, ext_id text UNIQUE, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS iq_vessels (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), vessel text NOT NULL, port text NOT NULL, terminal text, cargo text, commodity text, tonnage numeric, origin text, consignee text, eta timestamptz, ata timestamptz, etd timestamptz, atd timestamptz, status text NOT NULL DEFAULT 'expected' CHECK (status IN ('expected','anchored','berthed','discharging','departed','cancelled')), source text NOT NULL DEFAULT 'manual', source_url text, notes text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS iq_vessels_eta ON iq_vessels(coalesce(ata,eta));
CREATE TABLE IF NOT EXISTS iq_jobs (name text PRIMARY KEY, every_minutes int NOT NULL, last_run timestamptz, last_ok timestamptz, last_error text, runs int NOT NULL DEFAULT 0, history jsonb NOT NULL DEFAULT '[]');`},
 {id:2,name:"tasks_v2",sql:`
ALTER TABLE q_tasks ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('high','normal','low'));
ALTER TABLE q_tasks ADD COLUMN IF NOT EXISTS recur text CHECK (recur IS NULL OR recur IN ('daily','weekdays','weekly','monthly'));
ALTER TABLE q_alerts ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz;
CREATE INDEX IF NOT EXISTS q_alerts_created ON q_alerts(created_at DESC);`},
 {id:3,name:"office_work_v1",sql:`
CREATE TABLE IF NOT EXISTS q_office_work (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), staff text NOT NULL, job text NOT NULL, title text NOT NULL, body jsonb NOT NULL,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','approved','discarded')), period text, created_at timestamptz NOT NULL DEFAULT now(), decided_at timestamptz);
CREATE INDEX IF NOT EXISTS q_office_work_status ON q_office_work(status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS q_office_work_period ON q_office_work(staff, job, period) WHERE period IS NOT NULL;`}
];

let ready:Promise<void>|null=null;
export function ensureSchema(){
 if(!ready)ready=migrate().catch(e=>{ready=null;throw e;});
 return ready;
}
async function migrate(){
 const c=await getDb().connect();
 try{
  await c.query("BEGIN");
  await c.query("SELECT pg_advisory_xact_lock(7314001)");
  await c.query("CREATE TABLE IF NOT EXISTS schema_migrations (id int PRIMARY KEY, name text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())");
  const {rows}=await c.query("SELECT id FROM schema_migrations");
  const done=new Set(rows.map(r=>Number(r.id)));
  for(const m of MIGRATIONS){
   if(done.has(m.id))continue;
   await c.query(m.sql);
   await c.query("INSERT INTO schema_migrations (id,name) VALUES ($1,$2)",[m.id,m.name]);
  }
  await c.query("COMMIT");
 }catch(e){await c.query("ROLLBACK").catch(()=>{});throw e;}
 finally{c.release();}
}
