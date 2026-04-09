<div align="center">

# Traces

### Local-first LLM observability. PostgreSQL only. Deploy in 30 seconds.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![npm: traces-dev](https://img.shields.io/npm/v/traces-dev?label=traces-dev&color=red)](https://www.npmjs.com/package/traces-dev)
[![npm: traces-sdk](https://img.shields.io/npm/v/traces-sdk?label=traces-sdk&color=red)](https://www.npmjs.com/package/traces-sdk)

**The lightweight, self-hosted alternative to Langfuse and Lunary.**
No ClickHouse. No Redis. No Docker. No Kubernetes. Just PostgreSQL.

---

```bash
npx traces-dev
```

**That's it. Dashboard at `localhost:3100`. Start tracing.**

---

</div>

## Why Traces?

Every LLM observability tool tells you to spin up Docker Compose files with 6+ services, allocate gigabytes of RAM, and pray your ClickHouse cluster stays healthy. We think that's insane for most teams.

Traces is a single Node.js process that talks to PostgreSQL. Nothing else. You can run it on a $5 VPS, your laptop, or a Raspberry Pi. It starts in 30 seconds, uses ~200 MB of RAM, and auto-creates its own schema on first boot.

If you're running local models with Ollama, Traces is the only tool that gives you first-class support with tokens-per-second metrics out of the box.

### How it compares

| | Langfuse | Lunary | **Traces** |
|---|---|---|---|
| Deploy time | 15+ min (Docker, 6 services) | Docker + K8s | **30 seconds** |
| Dependencies | PG + ClickHouse + Redis + MinIO | PG + Redis + K8s | **PostgreSQL only** |
| RAM usage | 4-8 GB | 2-4 GB | **~200 MB** |
| Local models | Basic | No | **First-class** (tok/s) |
| SDK complexity | Complex hierarchy | Moderate | **2 lines** |
| Self-host cost | $20-50/mo | Similar | **$0** |

## What You Get

Everything is auto-calculated from your spans. No configuration needed.

- **Traces & Spans** -- Full request lifecycle with nested span waterfalls
- **Cost Tracking** -- Auto-calculated from token counts using built-in pricing for 20+ models
- **Latency** -- End-to-end and per-span timing with P50/P95 breakdowns
- **Tokens/sec** -- First-class throughput metrics, essential for local model tuning
- **Error Tracking** -- Failed spans, error rates by model, error detail inspection
- **Model Analytics** -- Per-model dashboards with calls, cost, latency, throughput
- **Prompt Versioning** -- Template management with full version history
- **Live Feed** -- Real-time WebSocket stream of incoming spans

## Quick Start

### 1. Start the server

```bash
# Zero-install — just run it
npx traces-dev

# Or install globally
npm install -g traces-dev
traces start

# Point to your own database
DATABASE_URL="postgresql://user:pass@host:5432/mydb" npx traces-dev
```

The server auto-creates tables on first boot, generates API keys, and starts the dashboard.

### 2. Install the SDK

```bash
npm install traces-sdk
```

### 3. Instrument your code

```typescript
import { Traces } from 'traces-sdk';
import OpenAI from 'openai';

const traces = new Traces({
  secretKey: 'sk-trc-...',  // printed on server startup
  baseUrl: 'http://localhost:3100',
});

// One line. All calls are now traced.
const openai = traces.wrap(new OpenAI());

// Use as normal — Traces captures everything automatically
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

Open `http://localhost:3100`. Your traces are already there.

## Dashboard

Six pages, all built with a frosted-glass Apple-inspired design system:

| Page | What it shows |
|---|---|
| **Overview** | Summary cards, cost time-series chart, active models table |
| **Traces** | Searchable trace list with span waterfall + detail inspector |
| **Models** | Per-model stat cards: calls, cost, latency, tok/s, errors |
| **Costs** | Stacked bar charts, daily/model breakdown, cost-by-model view |
| **Prompts** | Prompt template versioning with full version history |
| **Live** | Real-time WebSocket feed with pause, filter, auto-scroll |

## Architecture

```
┌─────────────────────────────────────────┐
│  Traces (single Node.js process)        │
│                                         │
│  ┌──────────┐  ┌────────────────────┐   │
│  │ Fastify  │  │ Next.js Dashboard  │   │
│  │ Trace API│  │ (embedded static)  │   │
│  └────┬─────┘  └────────┬───────────┘   │
│       │                 │               │
│  ┌────┴─────────────────┴───────────┐   │
│  │         PostgreSQL               │   │
│  │  traces, spans, prompts, costs   │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

One process. One database. That's the whole system.

## SDK Usage

### Auto-instrument (recommended)

```typescript
import { Traces } from 'traces-sdk';

const traces = new Traces({ secretKey: 'sk-trc-...' });

// Works with any OpenAI-compatible client
const openai = traces.wrap(new OpenAI());
const anthropic = traces.wrap(new Anthropic());
```

### Manual spans

```typescript
const trace = await traces.trace({ name: 'summarize', userId: 'user-123' });
const span = trace.span({ name: 'llm-call', model: 'claude-sonnet-4' });

span.input({ messages: [{ role: 'user', content: 'Summarize this...' }] });
const result = await client.chat(messages);
span.output(result).tokens(1500, 800).end();

await traces.flush();
```

### Trace grouping

```typescript
const trace = await traces.trace({
  name: 'chat-session',
  userId: 'user-123',
  sessionId: 'session-abc',
});

const span1 = trace.span({ name: 'classify', model: 'claude-haiku-4-5' });
// ... classify intent
span1.end();

const span2 = trace.span({ name: 'respond', model: 'claude-sonnet-4' });
// ... generate response
span2.end();
```

## Auto-Pricing

Traces automatically calculates cost when you send `inputTokens` and `outputTokens`. No config required. Supported models:

| Provider | Models |
|---|---|
| **Anthropic** | Claude Opus 4, Sonnet 4, Haiku 4 (all versions) |
| **OpenAI** | GPT-4o, GPT-4o-mini, o3, o3-mini, o4-mini |
| **Google** | Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.0 Flash |
| **DeepSeek** | deepseek-chat, deepseek-reasoner |
| **Ollama** | Any model (free -- $0) |

## API Reference

### Ingest

```
POST /api/traces    Create a trace
POST /api/spans     Create span(s) — supports batch (array)
```

### Query

```
GET /api/traces              List traces (with span count, cost, latency)
GET /api/traces/:id          Trace detail with all spans
GET /api/stats/overview      Summary stats (cost, latency, errors)
GET /api/stats/timeseries    Daily breakdown by model/provider
GET /api/stats/models        Per-model metrics
GET /api/pricing             Model pricing table
```

### Prompts

```
GET  /api/prompts            List prompts (latest version)
GET  /api/prompts/:name      All versions of a prompt
POST /api/prompts            Create prompt / new version
```

### Real-time

```
WS /api/live                 WebSocket stream of incoming spans
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://localhost:5432/traces` | PostgreSQL connection string |
| `TRACES_PORT` | `3100` | Server port |
| `TRACES_HOST` | `0.0.0.0` | Bind address |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |

## Stack

| Layer | Technology |
|---|---|
| **Server** | Fastify 5 + TypeScript |
| **Database** | PostgreSQL + Drizzle ORM |
| **Dashboard** | Next.js 16 + Recharts |
| **SDK** | Zero-dependency TypeScript |

## Contributing

Contributions are welcome. Traces is intentionally simple -- PRs that keep it that way are appreciated.

```bash
git clone https://github.com/parallelromb/traces.git
cd traces
npm install
npm run dev
```

Please open an issue before submitting large changes.

## License

MIT -- [Sri](https://github.com/parallelromb)
