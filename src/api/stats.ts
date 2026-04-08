import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { spans, traces } from '../db/schema.js';
import { eq, and, gte, lte, sql, desc, count, sum, avg } from 'drizzle-orm';
import { authenticate } from './auth.js';

export async function statsRoutes(app: FastifyInstance) {
  // ── GET /api/stats/overview ──────────────────────────
  app.get('/api/stats/overview', async (req, reply) => {
    const auth = await authenticate(req, reply);
    if (!auth) return;

    const query = req.query as Record<string, string>;
    const days = parseInt(query.days ?? '30');
    const since = new Date(Date.now() - days * 86400000);

    const conditions = [
      eq(spans.projectId, auth.projectId),
      gte(spans.createdAt, since),
    ];

    const [overview] = await db.select({
      totalSpans: count(),
      totalCost: sum(spans.costUsd),
      avgLatency: avg(spans.latencyMs),
      errorCount: sql<number>`COUNT(*) FILTER (WHERE ${spans.status} = 'error')`,
      totalInputTokens: sum(spans.inputTokens),
      totalOutputTokens: sum(spans.outputTokens),
    }).from(spans).where(and(...conditions));

    const [traceCount] = await db.select({ total: count() })
      .from(traces)
      .where(and(eq(traces.projectId, auth.projectId), gte(traces.createdAt, since)));

    const modelBreakdown = await db.select({
      model: spans.model,
      provider: spans.provider,
      count: count(),
      totalCost: sum(spans.costUsd),
      avgLatency: avg(spans.latencyMs),
      avgTokensPerSec: avg(spans.tokensPerSec),
    }).from(spans)
      .where(and(...conditions))
      .groupBy(spans.model, spans.provider)
      .orderBy(desc(count()));

    reply.send({
      period: { days, since: since.toISOString() },
      totalTraces: traceCount.total,
      totalSpans: overview.totalSpans,
      totalCost: parseFloat(overview.totalCost ?? '0'),
      avgLatencyMs: Math.round(parseFloat(overview.avgLatency ?? '0')),
      errorCount: overview.errorCount,
      errorRate: overview.totalSpans > 0 ? overview.errorCount / overview.totalSpans : 0,
      totalInputTokens: parseInt(overview.totalInputTokens ?? '0'),
      totalOutputTokens: parseInt(overview.totalOutputTokens ?? '0'),
      models: modelBreakdown.map(m => ({
        model: m.model,
        provider: m.provider,
        count: m.count,
        totalCost: parseFloat(m.totalCost ?? '0'),
        avgLatencyMs: Math.round(parseFloat(m.avgLatency ?? '0')),
        avgTokensPerSec: parseFloat(m.avgTokensPerSec ?? '0'),
      })),
    });
  });

  // ── GET /api/stats/timeseries ────────────────────────
  app.get('/api/stats/timeseries', async (req, reply) => {
    const auth = await authenticate(req, reply);
    if (!auth) return;

    const query = req.query as Record<string, string>;
    const days = parseInt(query.days ?? '30');
    const since = new Date(Date.now() - days * 86400000);
    const groupBy = query.groupBy ?? 'model'; // model or provider

    const rows = await db.execute(sql`
      SELECT
        date_trunc('day', created_at)::date AS day,
        ${groupBy === 'provider' ? sql`provider` : sql`model`} AS group_key,
        COUNT(*) AS count,
        COALESCE(SUM(cost_usd), 0) AS total_cost,
        ROUND(AVG(latency_ms)) AS avg_latency,
        COUNT(*) FILTER (WHERE status = 'error') AS errors
      FROM spans
      WHERE project_id = ${auth.projectId}::uuid
        AND created_at >= ${since.toISOString()}::timestamptz
      GROUP BY day, group_key
      ORDER BY day ASC, group_key
    `);

    reply.send({ period: { days }, groupBy, data: rows });
  });

  // ── GET /api/stats/models ────────────────────────────
  app.get('/api/stats/models', async (req, reply) => {
    const auth = await authenticate(req, reply);
    if (!auth) return;

    const query = req.query as Record<string, string>;
    const days = parseInt(query.days ?? '30');
    const since = new Date(Date.now() - days * 86400000);

    const rows = await db.execute(sql`
      SELECT
        model,
        provider,
        COUNT(*) AS total_calls,
        COALESCE(SUM(cost_usd), 0)::float AS total_cost,
        ROUND(AVG(latency_ms)) AS avg_latency_ms,
        ROUND(AVG(tokens_per_sec)::numeric, 1) AS avg_tokens_per_sec,
        COALESCE(SUM(input_tokens), 0) AS total_input_tokens,
        COALESCE(SUM(output_tokens), 0) AS total_output_tokens,
        COUNT(*) FILTER (WHERE status = 'error') AS error_count,
        ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'error') / NULLIF(COUNT(*), 0), 2) AS error_rate
      FROM spans
      WHERE project_id = ${auth.projectId}::uuid
        AND created_at >= ${since.toISOString()}::timestamptz
      GROUP BY model, provider
      ORDER BY total_cost DESC
    `);

    reply.send({ period: { days }, models: rows });
  });
}
