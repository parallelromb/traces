import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { promptVersions } from '../db/schema.js';
import { eq, and, desc, sql, max } from 'drizzle-orm';
import { authenticate } from './auth.js';

export async function promptRoutes(app: FastifyInstance) {
  // ── GET /api/prompts ─────────────────────────────────
  // List all prompts (latest version of each)
  app.get('/api/prompts', async (req, reply) => {
    const auth = await authenticate(req, reply);
    if (!auth) return;

    const rows = await db.execute(sql`
      SELECT DISTINCT ON (name)
        id, name, version, template, variables, metadata, created_at AS "createdAt"
      FROM prompt_versions
      WHERE project_id = ${auth.projectId}::uuid
      ORDER BY name, version DESC
    `);

    reply.send({ items: rows });
  });

  // ── GET /api/prompts/:name ───────────────────────────
  // Get all versions of a prompt
  app.get('/api/prompts/:name', async (req, reply) => {
    const auth = await authenticate(req, reply);
    if (!auth) return;
    const { name } = req.params as { name: string };

    const rows = await db.select().from(promptVersions)
      .where(and(eq(promptVersions.projectId, auth.projectId), eq(promptVersions.name, name)))
      .orderBy(desc(promptVersions.version));

    if (rows.length === 0) {
      return reply.code(404).send({ error: 'Prompt not found' });
    }

    reply.send({ name, versions: rows });
  });

  // ── GET /api/prompts/:name/:version ──────────────────
  app.get('/api/prompts/:name/:version', async (req, reply) => {
    const auth = await authenticate(req, reply);
    if (!auth) return;
    const { name, version } = req.params as { name: string; version: string };

    const [row] = await db.select().from(promptVersions)
      .where(and(
        eq(promptVersions.projectId, auth.projectId),
        eq(promptVersions.name, name),
        eq(promptVersions.version, parseInt(version)),
      ))
      .limit(1);

    if (!row) return reply.code(404).send({ error: 'Version not found' });
    reply.send(row);
  });

  // ── POST /api/prompts ────────────────────────────────
  // Create a new prompt or a new version of an existing prompt
  app.post('/api/prompts', async (req, reply) => {
    const auth = await authenticate(req, reply);
    if (!auth) return;

    const body = req.body as any;
    if (!body.name || !body.template) {
      return reply.code(400).send({ error: 'name and template are required' });
    }

    // Get the latest version number for this prompt
    const [latest] = await db.select({ maxVersion: max(promptVersions.version) })
      .from(promptVersions)
      .where(and(eq(promptVersions.projectId, auth.projectId), eq(promptVersions.name, body.name)));

    const nextVersion = (latest?.maxVersion ?? 0) + 1;

    const [row] = await db.insert(promptVersions).values({
      projectId: auth.projectId,
      name: body.name,
      version: body.version ?? nextVersion,
      template: body.template,
      variables: body.variables ?? null,
      metadata: body.metadata ?? null,
    }).returning();

    reply.code(201).send(row);
  });
}
