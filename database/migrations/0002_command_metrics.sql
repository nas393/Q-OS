-- Business metrics pushed by other projects via POST /api/ingest.
-- The app also creates this table on first use (CREATE TABLE IF NOT EXISTS), so applying this file is optional.
CREATE TABLE IF NOT EXISTS command_metrics (
  metric_key text PRIMARY KEY,
  payload jsonb NOT NULL,
  source text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
