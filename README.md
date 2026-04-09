# Traces

**Local-first LLM observability. PostgreSQL only. Deploy in 30 seconds.**

Traces is a lightweight alternative to Langfuse, Lunary, and LangWatch. No ClickHouse, no Redis, no Docker — just PostgreSQL and a single Node.js process.

```bash
npx traces-dev
```

## Why Traces?

| | Langfuse | Lunary | **Traces** |
|---|---|---|---|
| Deploy time | 15+ min (Docker, 6 services) | Docker + K8s | **30 seconds** |
| Dependencies | PG + ClickHouse + Redis + MinIO | PG + Redis + K8s | **PostgreSQL only** |
| RAM | 4-8 GB | 2-4 GB | **~200 MB** |
| Local models | Basic | No | **First-class** (tok/s) |
| SDK | Complex hierarchy | Moderate | **2 lines** |
| Self-host cost | $20-50/mo | Similar | **$0** |

## Quick Start

### 1. Start the server

```bash
# Using npx (no install needed)
npx traces-dev

# Or install globally
npm install -g traces-dev
traces start

# Custom database
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
  secretKey: 'sk-trc-...',  // from server startup output
  baseUrl: 'http://localhost:3100',
});

// Auto-instrument — wraps all API calls automatically
const openai = traces.wrap(new OpenAI());

// Use as normal — Traces captures everything
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

That's it. Open `http://localhost:3100` to see your traces.

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

## Dashboard

6 pages, all using a frosted-glass Apple-inspired design:

- **Overview** — Summary cards, cost time-series chart, active models table
- **Traces** — Searchable trace list → click for span waterfall + inspector
- **Models** — Per-model stat cards (calls, cost, latency, tok/s, errors)
- **Costs** — Stacked bar chart, daily/model breakdown, cost-by-model bars
- **Prompts** — Prompt template versioning with version history
- **Live** — Real-time WebSocket feed with pause, filter, auto-scroll

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

## Auto-Pricing

Traces automatically calculates cost when you send `inputTokens` and `outputTokens`. Supported models:

- **Anthropic**: Claude Opus 4, Sonnet 4, Haiku 4 (all versions)
- **OpenAI**: GPT-4o, GPT-4o-mini, o3, o3-mini, o4-mini
- **Google**: Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.0 Flash
- **DeepSeek**: deepseek-chat, deepseek-reasoner
- **Ollama**: Any model (free — $0)

## Configuration

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://localhost:5432/traces` | PostgreSQL connection string |
| `TRACES_PORT` | `3100` | Server port |
| `TRACES_HOST` | `0.0.0.0` | Bind address |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |

## Stack

- **Server**: Fastify 5 + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **Dashboard**: Next.js 16 + Recharts
- **SDK**: Zero-dependency TypeScript

## License

MIT — [parallelromb](https://github.com/parallelromb)
