import { db } from './index.js';
import { projects, apiKeys } from './schema.js';
import { eq } from 'drizzle-orm';
import { createHash, randomBytes } from 'crypto';
import { nanoid } from 'nanoid';

export async function seed() {
  // Check if default project exists
  const existing = await db.select().from(projects).where(eq(projects.name, 'default')).limit(1);
  if (existing.length > 0) {
    console.log('[traces] Default project already exists.');
    return existing[0];
  }

  // Create default project
  const [project] = await db.insert(projects).values({
    name: 'default',
  }).returning();
  console.log(`[traces] Created default project: ${project.id}`);

  // Generate API key pair
  const publicKey = `pk-trc-${nanoid(24)}`;
  const secretKey = `sk-trc-${nanoid(32)}`;
  const secretHash = createHash('sha256').update(secretKey).digest('hex');

  await db.insert(apiKeys).values({
    projectId: project.id,
    publicKey,
    secretHash,
    name: 'Default API Key',
  });

  console.log(`[traces] API keys generated:`);
  console.log(`  Public:  ${publicKey}`);
  console.log(`  Secret:  ${secretKey}`);
  console.log(`  (save the secret key — it won't be shown again)`);

  return project;
}
