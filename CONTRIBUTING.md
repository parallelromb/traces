# Contributing to Traces

Thanks for your interest in contributing! Traces is intentionally simple and we want to keep it that way.

## Getting Started

```bash
git clone https://github.com/parallelromb/traces.git
cd traces
npm install
npm run dev
```

Dashboard (separate terminal):
```bash
cd dashboard
npm install
npm run dev
```

SDK:
```bash
cd sdk
npm install
npm run dev
```

## Running Tests

```bash
# SDK unit tests
cd sdk && npm test

# Server integration tests (requires running server + PostgreSQL)
npm run test:integration
```

## Before Submitting a PR

1. Open an issue first for large changes
2. Keep the scope small — one feature or fix per PR
3. Run the tests
4. Follow existing code style (no linter config needed — just match what's there)

## What We Value

- **Simplicity over features** — don't add complexity unless it solves a real problem
- **PostgreSQL only** — no new infrastructure dependencies
- **Zero-config defaults** — everything should work out of the box
- **Backward compatibility** — don't break existing API contracts

## What We Don't Want

- ClickHouse, Redis, or any additional database dependencies
- Docker as a requirement for running Traces
- Complex configuration that requires reading docs to understand
- Features that only matter at massive scale (we target small-to-medium teams)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
