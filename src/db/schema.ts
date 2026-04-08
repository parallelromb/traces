import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

// ── Projects (multi-tenant) ────────────────────────────
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── API Keys (per-project) ─────────────────────────────
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  publicKey: text('public_key').unique().notNull(),   // pk-trc-xxx
  secretHash: text('secret_hash').notNull(),           // hashed sk-trc-xxx
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Traces (one per conversation/session) ──────────────
export const traces = pgTable('traces', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  name: text('name'),
  userId: text('user_id'),       // app-level user identifier
  sessionId: text('session_id'), // group related traces
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('idx_traces_project_time').on(t.projectId, t.createdAt),
  index('idx_traces_session').on(t.sessionId),
]);

// ── Spans (one per LLM call — the core table) ─────────
export const spans = pgTable('spans', {
  id: uuid('id').primaryKey().defaultRandom(),
  traceId: uuid('trace_id').references(() => traces.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  parentId: uuid('parent_id'),          // nested spans
  name: text('name'),                   // "chat.completion", "embedding"
  provider: text('provider'),           // "anthropic", "openai", "ollama"
  model: text('model'),                 // "claude-opus-4", "gemma4:e4b"
  input: jsonb('input'),                // prompt/messages
  output: jsonb('output'),              // completion
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  totalTokens: integer('total_tokens'),
  costUsd: numeric('cost_usd', { precision: 12, scale: 8 }),
  latencyMs: integer('latency_ms'),
  tokensPerSec: numeric('tokens_per_sec', { precision: 10, scale: 2 }),
  status: text('status').default('ok').notNull(), // ok, error
  error: text('error'),
  metadata: jsonb('metadata'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('idx_spans_trace').on(t.traceId),
  index('idx_spans_project_time').on(t.projectId, t.createdAt),
  index('idx_spans_model').on(t.model, t.createdAt),
]);

// ── Prompt Versions ────────────────────────────────────
export const promptVersions = pgTable('prompt_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  name: text('name').notNull(),
  version: integer('version').notNull(),
  template: text('template').notNull(),
  variables: jsonb('variables'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('idx_prompt_project_name_version').on(t.projectId, t.name, t.version),
]);
