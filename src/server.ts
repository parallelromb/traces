import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { config } from './config.js';
import { migrate } from './db/migrate.js';
import { seed } from './db/seed.js';
import { ingestRoutes } from './api/ingest.js';
import { traceRoutes } from './api/traces.js';
import { statsRoutes } from './api/stats.js';
import { liveRoutes } from './api/live.js';
import { promptRoutes } from './api/prompts.js';
import { listModels } from './pricing/models.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function createServer() {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      transport: {
        target: 'pino-pretty',
        options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
      },
    },
  });

  // Plugins
  await app.register(cors, { origin: true });
  await app.register(websocket);

  // Routes
  await app.register(ingestRoutes);
  await app.register(traceRoutes);
  await app.register(statsRoutes);
  await app.register(liveRoutes);
  await app.register(promptRoutes);

  // ── Health check ─────────────────────────────────────
  app.get('/health', async () => ({
    status: 'ok',
    version: '0.1.0',
    uptime: process.uptime(),
  }));

  // ── Model pricing list ───────────────────────────────
  app.get('/api/pricing', async () => ({
    models: listModels(),
  }));

  // ── Serve dashboard static files ─────────────────────
  const dashboardDir = join(__dirname, '..', 'dashboard', 'out');
  if (existsSync(dashboardDir)) {
    await app.register(fastifyStatic, {
      root: dashboardDir,
      prefix: '/',
    });

    // SPA fallback: serve index.html for any non-API, non-file route
    app.setNotFoundHandler(async (req, reply) => {
      if (req.url.startsWith('/api/')) {
        return reply.code(404).send({ error: 'Not found' });
      }
      // Try page-specific HTML first (e.g., /traces → /traces.html)
      const pagePath = join(dashboardDir, req.url + '.html');
      if (existsSync(pagePath)) {
        return reply.sendFile(req.url + '.html');
      }
      return reply.sendFile('index.html');
    });
    console.log('[traces] Dashboard loaded from', dashboardDir);
  } else {
    console.log('[traces] No dashboard build found. Run: cd dashboard && npm run build');
  }

  return app;
}

export async function start() {
  console.log(`
  ╔══════════════════════════════════════╗
  ║          traces-dev v0.1.0           ║
  ║   Local-first LLM observability      ║
  ╚══════════════════════════════════════╝
  `);

  // Run migrations
  await migrate();

  // Seed default project if needed
  await seed();

  // Create and start server
  const app = await createServer();

  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`\n  Dashboard:  http://localhost:${config.port}`);
    console.log(`  Ingest:     POST http://localhost:${config.port}/api/spans`);
    console.log(`  Live feed:  ws://localhost:${config.port}/api/live`);
    console.log(`  Health:     http://localhost:${config.port}/health\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Direct execution
start();
