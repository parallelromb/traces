import postgres from 'postgres';
import { config } from '../config.js';
import * as schema from './schema.js';

const TABLES_SQL = `
-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id),
  public_key  TEXT UNIQUE NOT NULL,
  secret_hash TEXT NOT NULL,
  name        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Traces
CREATE TABLE IF NOT EXISTS traces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id),
  name        TEXT,
  user_id     TEXT,
  session_id  TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_traces_project_time ON traces(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_traces_session ON traces(session_id);

-- Spans
CREATE TABLE IF NOT EXISTS spans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id        UUID NOT NULL REFERENCES traces(id),
  project_id      UUID NOT NULL REFERENCES projects(id),
  parent_id       UUID,
  name            TEXT,
  provider        TEXT,
  model           TEXT,
  input           JSONB,
  output          JSONB,
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  total_tokens    INTEGER,
  cost_usd        NUMERIC(12,8),
  latency_ms      INTEGER,
  tokens_per_sec  NUMERIC(10,2),
  status          TEXT NOT NULL DEFAULT 'ok',
  error           TEXT,
  metadata        JSONB,
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_spans_trace ON spans(trace_id);
CREATE INDEX IF NOT EXISTS idx_spans_project_time ON spans(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spans_model ON spans(model, created_at DESC);

-- Prompt Versions
CREATE TABLE IF NOT EXISTS prompt_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id),
  name        TEXT NOT NULL,
  version     INTEGER NOT NULL,
  template    TEXT NOT NULL,
  variables   JSONB,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, name, version)
);
`;

export async function migrate(url?: string) {
  const sql = postgres(url ?? config.databaseUrl, { onnotice: () => {} });
  try {
    console.log('[traces] Running migrations...');
    await sql.unsafe(TABLES_SQL);
    console.log('[traces] Migrations complete.');
  } finally {
    await sql.end();
  }
}
