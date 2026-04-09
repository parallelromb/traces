import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { traces, spans } from '../db/schema.js';
import { eq, and, sql, count } from 'drizzle-orm';
import { authenticate } from './auth.js';

export async function traceRoutes(app: FastifyInstance) {
  // ── GET /api/traces ──────────────────────────────────
  app.get('/api/traces', async (req, reply) => {
    const auth = await authenticate(req, reply);
    if (!auth) return;

    const query = req.query as Record<string, string>;
    const limit = Math.min(parseInt(query.limit ?? '50'), 200);
    const offset = parseInt(query.offset ?? '0');

    const rows = await db.execute(sql`
      SELECT
        t.id, t.name, t.user_id AS "userId", t.session_id AS "sessionId",
        t.metadata, t.created_at AS "createdAt",
        (SELECT COUNT(*) FROM spans s WHERE s.trace_id = t.id)::int AS "spanCount",
        (SELECT COALESCE(SUM(s.latency_ms), 0) FROM spans s WHERE s.trace_id = t.id)::int AS "totalLatency",
        (SELECT COALESCE(SUM(s.cost_usd), 0) FROM spans s WHERE s.trace_id = t.id)::float AS "totalCost"
      FROM traces t
      WHERE t.project_id = ${auth.projectId}::uuid
        ${query.name ? sql`AND t.name ILIKE ${'%' + query.name + '%'}` : sql``}
        ${query.userId ? sql`AND t.user_id = ${query.userId}` : sql``}
        ${query.sessionId ? sql`AND t.session_id = ${query.sessionId}` : sql``}
        ${query.from ? sql`AND t.created_at >= ${query.from}::timestamptz` : sql``}
        ${query.to ? sql`AND t.created_at <= ${query.to}::timestamptz` : sql``}
      ORDER BY t.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const [{ total }] = await db.select({ total: count() }).from(traces)
      .where(eq(traces.projectId, auth.projectId));

    reply.send({ items: rows, total, limit, offset });
  });

  // ── GET /api/traces/:id ──────────────────────────────
  app.get('/api/traces/:id', async (req, reply) => {
    const auth = await authenticate(req, reply);
    if (!auth) return;

    const { id } = req.params as { id: string };

    const [trace] = await db.select().from(traces)
      .where(and(eq(traces.id, id), eq(traces.projectId, auth.projectId)))
      .limit(1);

    if (!trace) {
      return reply.code(404).send({ error: 'Trace not found' });
    }

    const traceSpans = await db.select().from(spans)
      .where(eq(spans.traceId, id))
      .orderBy(spans.startedAt, spans.createdAt);

    reply.send({ ...trace, spans: traceSpans });
  });
}
