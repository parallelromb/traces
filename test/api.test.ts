import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE = 'http://localhost:3100';

// These tests assume the server is already running on port 3100
// In CI, the server is started before running these tests

describe('API Integration Tests', () => {
  let projectId: string;
  let traceId: string;
  let spanId: string;

  beforeAll(async () => {
    // Verify server is running
    const health = await fetch(`${BASE}/health`);
    expect(health.ok).toBe(true);
  });

  describe('Health', () => {
    it('GET /health returns ok', async () => {
      const res = await fetch(`${BASE}/health`);
      const body = await res.json();
      expect(body.status).toBe('ok');
      expect(body.version).toBeTruthy();
      expect(body.uptime).toBeGreaterThan(0);
    });
  });

  describe('Traces', () => {
    it('POST /api/traces creates a trace', async () => {
      const res = await fetch(`${BASE}/api/traces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'test-trace',
          userId: 'integration-test',
          sessionId: 'test-session',
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toBeTruthy();
      expect(body.name).toBe('test-trace');
      expect(body.userId).toBe('integration-test');
      traceId = body.id;
      projectId = body.projectId;
    });

    it('GET /api/traces lists traces', async () => {
      const res = await fetch(`${BASE}/api/traces`);
      const body = await res.json();
      expect(body.items).toBeInstanceOf(Array);
      expect(body.total).toBeGreaterThan(0);
      expect(body.limit).toBeTruthy();
    });

    it('GET /api/traces/:id returns trace detail', async () => {
      const res = await fetch(`${BASE}/api/traces/${traceId}`);
      expect(res.ok).toBe(true);
      const body = await res.json();
      expect(body.id).toBe(traceId);
      expect(body.name).toBe('test-trace');
      expect(body.spans).toBeInstanceOf(Array);
    });
  });

  describe('Spans', () => {
    it('POST /api/spans creates a span', async () => {
      const res = await fetch(`${BASE}/api/spans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          traceId,
          name: 'test-completion',
          model: 'gpt-4o',
          provider: 'openai',
          input: { messages: [{ role: 'user', content: 'test' }] },
          output: { content: 'response' },
          inputTokens: 10,
          outputTokens: 20,
          latencyMs: 500,
          status: 'ok',
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toBeTruthy();
      expect(body.model).toBe('gpt-4o');
      spanId = body.id;
    });

    it('POST /api/spans supports batch creation', async () => {
      const res = await fetch(`${BASE}/api/spans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          {
            traceId,
            name: 'batch-span-1',
            model: 'claude-sonnet-4-6',
            inputTokens: 5,
            outputTokens: 10,
            latencyMs: 200,
            startedAt: new Date().toISOString(),
            endedAt: new Date().toISOString(),
          },
          {
            traceId,
            name: 'batch-span-2',
            model: 'gemma4:e4b',
            provider: 'ollama',
            inputTokens: 8,
            outputTokens: 15,
            latencyMs: 100,
            startedAt: new Date().toISOString(),
            endedAt: new Date().toISOString(),
          },
        ]),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveLength(2);
    });

    it('auto-calculates cost from tokens', async () => {
      const res = await fetch(`${BASE}/api/spans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          traceId,
          name: 'cost-test',
          model: 'gpt-4o',
          inputTokens: 1000,
          outputTokens: 500,
          latencyMs: 800,
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
        }),
      });
      const body = await res.json();
      expect(parseFloat(body.costUsd)).toBeGreaterThan(0);
      expect(body.provider).toBe('openai');
    });

    it('auto-calculates tokens/sec', async () => {
      const res = await fetch(`${BASE}/api/spans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          traceId,
          name: 'tps-test',
          model: 'gemma4:e4b',
          provider: 'ollama',
          inputTokens: 100,
          outputTokens: 200,
          latencyMs: 1000,
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
        }),
      });
      const body = await res.json();
      expect(parseFloat(body.tokensPerSec)).toBe(200);
    });

    it('trace detail now includes spans', async () => {
      const res = await fetch(`${BASE}/api/traces/${traceId}`);
      const body = await res.json();
      expect(body.spans.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Stats', () => {
    it('GET /api/stats/overview returns totals', async () => {
      const res = await fetch(`${BASE}/api/stats/overview`);
      expect(res.ok).toBe(true);
      const body = await res.json();
      expect(body.totalTraces).toBeGreaterThan(0);
      expect(body.totalSpans).toBeGreaterThan(0);
    });

    it('GET /api/stats/models returns per-model stats', async () => {
      const res = await fetch(`${BASE}/api/stats/models`);
      expect(res.ok).toBe(true);
      const body = await res.json();
      expect(body.models).toBeInstanceOf(Array);
      expect(body.models.length).toBeGreaterThan(0);
    });
  });

  describe('Pricing', () => {
    it('GET /api/pricing returns model list', async () => {
      const res = await fetch(`${BASE}/api/pricing`);
      expect(res.ok).toBe(true);
      const body = await res.json();
      expect(body.models).toBeInstanceOf(Array);
      expect(body.models.length).toBeGreaterThan(10);
    });
  });
});
