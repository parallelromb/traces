import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { traces, spans } from '../db/schema.js';
import { authenticate } from './auth.js';
import { calculateCost, getProvider } from '../pricing/models.js';

function toDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export async function ingestRoutes(app: FastifyInstance) {
  // ── POST /api/traces ─────────────────────────────────
  app.post('/api/traces', async (req, reply) => {
    const auth = await authenticate(req, reply);
    if (!auth) return;

    const body = req.body as any;
    const items = Array.isArray(body) ? body : [body];

    const results = [];
    for (const item of items) {
      const [row] = await db.insert(traces).values({
        projectId: auth.projectId,
        name: item.name ?? null,
        userId: item.userId ?? item.user_id ?? null,
        sessionId: item.sessionId ?? item.session_id ?? null,
        metadata: item.metadata ?? null,
        ...(item.id ? { id: item.id } : {}),
      }).returning();
      results.push(row);
    }

    reply.code(201).send(results.length === 1 ? results[0] : results);
  });

  // ── POST /api/spans ──────────────────────────────────
  app.post('/api/spans', async (req, reply) => {
    const auth = await authenticate(req, reply);
    if (!auth) return;

    const body = req.body as any;
    const items = Array.isArray(body) ? body : [body];

    const results = [];
    for (const item of items) {
      const inputTokens = item.inputTokens ?? item.input_tokens ?? 0;
      const outputTokens = item.outputTokens ?? item.output_tokens ?? 0;
      const totalTokens = item.totalTokens ?? item.total_tokens ?? (inputTokens + outputTokens);
      const model = item.model ?? 'unknown';

      // Auto-calculate cost if not provided
      let costUsd = item.costUsd ?? item.cost_usd ?? null;
      let provider = item.provider ?? getProvider(model);

      if (costUsd === null && inputTokens > 0) {
        const calc = calculateCost(model, inputTokens, outputTokens);
        if (calc) {
          costUsd = calc.costUsd;
          if (!item.provider) provider = calc.provider;
        }
      }

      // Auto-calculate tokens/sec
      let tokensPerSec = item.tokensPerSec ?? item.tokens_per_sec ?? null;
      const latencyMs = item.latencyMs ?? item.latency_ms ?? null;
      if (tokensPerSec === null && latencyMs && outputTokens > 0) {
        tokensPerSec = (outputTokens / latencyMs) * 1000;
      }

      const [row] = await db.insert(spans).values({
        traceId: item.traceId ?? item.trace_id,
        projectId: auth.projectId,
        parentId: item.parentId ?? item.parent_id ?? null,
        name: item.name ?? null,
        provider,
        model,
        input: item.input ?? null,
        output: item.output ?? null,
        inputTokens,
        outputTokens,
        totalTokens,
        costUsd: costUsd?.toString() ?? null,
        latencyMs,
        tokensPerSec: tokensPerSec?.toString() ?? null,
        status: item.status ?? 'ok',
        error: item.error ?? null,
        metadata: item.metadata ?? null,
        startedAt: toDate(item.startedAt ?? item.started_at),
        endedAt: toDate(item.endedAt ?? item.ended_at),
        ...(item.id ? { id: item.id } : {}),
      }).returning();
      results.push(row);
    }

    // Emit to WebSocket live feed
    const feed = (app as any).liveFeed;
    if (feed) {
      for (const span of results) {
        feed.broadcast(span);
      }
    }

    reply.code(201).send(results.length === 1 ? results[0] : results);
  });
}
