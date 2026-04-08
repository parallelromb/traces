import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/index.js';
import { apiKeys, projects } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';

export type AuthContext = {
  projectId: string;
  publicKey: string;
};

// Authenticate via public key (header) or secret key (header)
// Public key: read-only dashboard access
// Secret key: write access (ingest)
export async function authenticate(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthContext | undefined> {
  const authHeader = req.headers.authorization;
  const publicKeyHeader = req.headers['x-traces-public-key'] as string | undefined;
  const secretKeyHeader = req.headers['x-traces-secret-key'] as string | undefined;

  // Try Bearer token (secret key)
  let secretKey: string | undefined;
  if (authHeader?.startsWith('Bearer ')) {
    secretKey = authHeader.slice(7);
  } else if (secretKeyHeader) {
    secretKey = secretKeyHeader;
  }

  if (secretKey) {
    const hash = createHash('sha256').update(secretKey).digest('hex');
    const [key] = await db.select().from(apiKeys).where(eq(apiKeys.secretHash, hash)).limit(1);
    if (key) {
      return { projectId: key.projectId, publicKey: key.publicKey };
    }
  }

  // Try public key (read-only)
  const pk = publicKeyHeader ?? (req.headers['x-traces-key'] as string | undefined);
  if (pk) {
    const [key] = await db.select().from(apiKeys).where(eq(apiKeys.publicKey, pk)).limit(1);
    if (key) {
      return { projectId: key.projectId, publicKey: key.publicKey };
    }
  }

  // No auth on localhost for dashboard
  const ip = req.ip;
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
    // Return first project
    const [project] = await db.select().from(projects).limit(1);
    if (project) {
      return { projectId: project.id, publicKey: 'localhost' };
    }
  }

  reply.code(401).send({ error: 'Unauthorized — provide X-Traces-Secret-Key or Bearer token' });
  return undefined;
}
