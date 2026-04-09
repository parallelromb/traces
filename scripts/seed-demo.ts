#!/usr/bin/env tsx
/**
 * Seeds realistic demo data into Traces.
 * Makes the dashboard look impressive out of the box.
 *
 * Usage: npx tsx scripts/seed-demo.ts
 */

const BASE = process.env.TRACES_URL ?? 'http://localhost:3100';
const headers = { 'Content-Type': 'application/json' };

// ── Realistic conversation templates ─────────────────────

const CONVERSATIONS = [
  {
    name: 'customer-support-bot',
    userId: 'user-alice',
    sessionId: 'session-support-1',
    spans: [
      { name: 'classify-intent', model: 'gpt-4o-mini', provider: 'openai', inputTokens: 120, outputTokens: 15, latencyMs: 280 },
      { name: 'retrieve-context', model: 'gpt-4o-mini', provider: 'openai', inputTokens: 250, outputTokens: 80, latencyMs: 450 },
      { name: 'generate-response', model: 'gpt-4o', provider: 'openai', inputTokens: 800, outputTokens: 350, latencyMs: 1200 },
    ],
  },
  {
    name: 'code-assistant',
    userId: 'user-bob',
    sessionId: 'session-code-1',
    spans: [
      { name: 'analyze-code', model: 'claude-sonnet-4-6', provider: 'anthropic', inputTokens: 2000, outputTokens: 500, latencyMs: 1800 },
      { name: 'generate-fix', model: 'claude-sonnet-4-6', provider: 'anthropic', inputTokens: 2500, outputTokens: 800, latencyMs: 2200 },
      { name: 'explain-change', model: 'claude-haiku-4-5', provider: 'anthropic', inputTokens: 1200, outputTokens: 300, latencyMs: 600 },
    ],
  },
  {
    name: 'content-pipeline',
    userId: 'user-charlie',
    sessionId: 'session-content-1',
    spans: [
      { name: 'outline', model: 'gemini-2.5-pro', provider: 'google', inputTokens: 500, outputTokens: 200, latencyMs: 900 },
      { name: 'draft', model: 'claude-opus-4', provider: 'anthropic', inputTokens: 1500, outputTokens: 2000, latencyMs: 8000 },
      { name: 'review', model: 'gpt-4o', provider: 'openai', inputTokens: 3000, outputTokens: 400, latencyMs: 1500 },
      { name: 'polish', model: 'claude-sonnet-4-6', provider: 'anthropic', inputTokens: 2500, outputTokens: 2200, latencyMs: 3200 },
    ],
  },
  {
    name: 'local-inference',
    userId: 'user-dev',
    sessionId: 'session-local-1',
    spans: [
      { name: 'ollama-chat', model: 'gemma4:e4b', provider: 'ollama', inputTokens: 200, outputTokens: 150, latencyMs: 800 },
      { name: 'ollama-summarize', model: 'gemma4:e4b', provider: 'ollama', inputTokens: 500, outputTokens: 100, latencyMs: 450 },
    ],
  },
  {
    name: 'rag-pipeline',
    userId: 'user-alice',
    sessionId: 'session-rag-1',
    spans: [
      { name: 'embed-query', model: 'text-embedding-3-small', provider: 'openai', inputTokens: 50, outputTokens: 0, latencyMs: 80 },
      { name: 'rerank', model: 'gpt-4o-mini', provider: 'openai', inputTokens: 800, outputTokens: 30, latencyMs: 300 },
      { name: 'generate', model: 'claude-sonnet-4-6', provider: 'anthropic', inputTokens: 3000, outputTokens: 600, latencyMs: 1800 },
    ],
  },
  {
    name: 'multi-model-comparison',
    userId: 'user-dev',
    sessionId: 'session-compare-1',
    spans: [
      { name: 'openai-response', model: 'gpt-4o', provider: 'openai', inputTokens: 500, outputTokens: 300, latencyMs: 1100 },
      { name: 'anthropic-response', model: 'claude-sonnet-4-6', provider: 'anthropic', inputTokens: 500, outputTokens: 280, latencyMs: 900 },
      { name: 'gemini-response', model: 'gemini-2.5-flash', provider: 'google', inputTokens: 500, outputTokens: 320, latencyMs: 700 },
      { name: 'deepseek-response', model: 'deepseek-chat', provider: 'deepseek', inputTokens: 500, outputTokens: 350, latencyMs: 1400 },
      { name: 'ollama-response', model: 'gemma4:e4b', provider: 'ollama', inputTokens: 500, outputTokens: 250, latencyMs: 2000 },
    ],
  },
  {
    name: 'error-handling-demo',
    userId: 'user-bob',
    sessionId: 'session-errors-1',
    spans: [
      { name: 'success-call', model: 'gpt-4o-mini', provider: 'openai', inputTokens: 100, outputTokens: 50, latencyMs: 200 },
      { name: 'rate-limited', model: 'claude-opus-4', provider: 'anthropic', inputTokens: 5000, outputTokens: 0, latencyMs: 150, status: 'error', error: 'Rate limit exceeded. Please retry after 30s.' },
      { name: 'retry-success', model: 'claude-sonnet-4-6', provider: 'anthropic', inputTokens: 5000, outputTokens: 1200, latencyMs: 3500 },
    ],
  },
  {
    name: 'translation-service',
    userId: 'user-charlie',
    sessionId: 'session-translate-1',
    spans: [
      { name: 'detect-language', model: 'gpt-4o-mini', provider: 'openai', inputTokens: 80, outputTokens: 10, latencyMs: 150 },
      { name: 'translate', model: 'gemini-2.5-flash', provider: 'google', inputTokens: 400, outputTokens: 420, latencyMs: 500 },
      { name: 'quality-check', model: 'gpt-4o-mini', provider: 'openai', inputTokens: 500, outputTokens: 30, latencyMs: 250 },
    ],
  },
];

// ── Seed data across multiple days ───────────────────────

async function createTrace(data: any) {
  const res = await fetch(`${BASE}/api/traces`, { method: 'POST', headers, body: JSON.stringify(data) });
  if (!res.ok) throw new Error(`Failed to create trace: ${res.status} ${await res.text()}`);
  return res.json();
}

async function createSpan(data: any) {
  const res = await fetch(`${BASE}/api/spans`, { method: 'POST', headers, body: JSON.stringify(data) });
  if (!res.ok) throw new Error(`Failed to create span: ${res.status} ${await res.text()}`);
  return res.json();
}

async function seed() {
  console.log('🌱 Seeding demo data into Traces...\n');

  let totalTraces = 0;
  let totalSpans = 0;

  // Seed across last 7 days with varying volume
  for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(9 + Math.floor(Math.random() * 10)); // 9 AM - 7 PM

    // More traces on recent days
    const reps = daysAgo === 0 ? 3 : daysAgo <= 2 ? 2 : 1;

    for (let rep = 0; rep < reps; rep++) {
      // Pick a random subset of conversations
      const shuffled = [...CONVERSATIONS].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 4 + Math.floor(Math.random() * 4));

      for (const conv of selected) {
        const traceTime = new Date(date.getTime() + rep * 3600000 + Math.random() * 3600000);

        const trace = await createTrace({
          name: conv.name,
          userId: conv.userId,
          sessionId: `${conv.sessionId}-d${daysAgo}-r${rep}`,
        });
        totalTraces++;

        // Create spans with realistic timing
        let spanOffset = 0;
        for (const spanDef of conv.spans) {
          const jitter = 0.8 + Math.random() * 0.4; // ±20% latency variation
          const latencyMs = Math.round(spanDef.latencyMs * jitter);
          const startedAt = new Date(traceTime.getTime() + spanOffset);
          const endedAt = new Date(startedAt.getTime() + latencyMs);
          spanOffset += latencyMs + 50; // 50ms gap between spans

          await createSpan({
            traceId: trace.id,
            name: spanDef.name,
            model: spanDef.model,
            provider: spanDef.provider,
            inputTokens: Math.round(spanDef.inputTokens * (0.9 + Math.random() * 0.2)),
            outputTokens: Math.round(spanDef.outputTokens * (0.9 + Math.random() * 0.2)),
            latencyMs,
            status: spanDef.status ?? 'ok',
            error: spanDef.error ?? null,
            startedAt: startedAt.toISOString(),
            endedAt: endedAt.toISOString(),
          });
          totalSpans++;
        }
      }
    }

    const dayLabel = daysAgo === 0 ? 'today' : `${daysAgo}d ago`;
    console.log(`  📅 ${dayLabel}: ${reps} batches seeded`);
  }

  // Seed some prompt versions
  console.log('\n  📝 Seeding prompt versions...');
  const prompts = [
    { name: 'system-prompt', versions: [
      'You are a helpful assistant.',
      'You are a helpful assistant. Be concise and accurate.',
      'You are a helpful assistant. Be concise, accurate, and friendly. Use markdown for formatting.',
    ]},
    { name: 'classify-intent', versions: [
      'Classify the user intent into: question, request, complaint, feedback.',
      'Classify the user intent into one of: question, action_request, complaint, feedback, greeting. Return JSON with "intent" and "confidence".',
    ]},
    { name: 'rag-context', versions: [
      'Use the following context to answer the question:\n\n{context}\n\nQuestion: {question}',
    ]},
  ];

  for (const prompt of prompts) {
    for (const template of prompt.versions) {
      await fetch(`${BASE}/api/prompts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: prompt.name, template }),
      });
    }
  }

  console.log(`\n✅ Demo data seeded: ${totalTraces} traces, ${totalSpans} spans`);
  console.log(`   Open http://localhost:3100 to see the dashboard\n`);
}

seed().catch(console.error);
