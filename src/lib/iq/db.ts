import {getDb} from "@/lib/db";

/* AngolaIQ schema (iq_* tables in the NASSIM OS database). Additive only: CREATE IF NOT EXISTS, never drops. */
let ensured=false;
export async function iqDb(){
 const db=getDb();
 if(ensured)return db;
 await db.query(`
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
CREATE TABLE IF NOT EXISTS iq_jobs (name text PRIMARY KEY, every_minutes int NOT NULL, last_run timestamptz, last_ok timestamptz, last_error text, runs int NOT NULL DEFAULT 0, history jsonb NOT NULL DEFAULT '[]');
`);
 ensured=true;
 return db;
}

export const SECTORS=["Oil and Gas","Agriculture","Food and Beverages","Manufacturing","Retail and FMCG","Banking and Finance","Construction","Infrastructure","Logistics and Ports","Mining","Telecommunications","Technology","Healthcare","Tourism","Education","Energy","Imports and Distribution"];
export const NEWS_CATEGORIES=["economy","politics","oil_gas","agriculture","food","trade","finance","infrastructure","technology","logistics","construction","mining","retail","manufacturing","regulation"] as const;
export const PROVINCES=["Luanda","Benguela","Huambo","Huíla","Namibe","Cabinda","Uíge","Malanje","Bengo","Bié","Cuanza Norte","Cuanza Sul","Cunene","Lunda Norte","Lunda Sul","Moxico","Cuando Cubango","Zaire"];
