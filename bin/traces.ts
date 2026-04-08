#!/usr/bin/env node

import { createInterface } from 'readline';
import { execSync } from 'child_process';

const BANNER = `
  ╔══════════════════════════════════════╗
  ║          traces-dev v0.1.0           ║
  ║   Local-first LLM observability      ║
  ╚══════════════════════════════════════╝
`;

async function prompt(question: string, fallback?: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    const suffix = fallback ? ` [${fallback}]` : '';
    rl.question(`  ${question}${suffix}: `, (answer) => {
      rl.close();
      resolve(answer.trim() || fallback || '');
    });
  });
}

function checkPostgres(url: string): boolean {
  try {
    execSync(`node -e "
      import('postgres').then(m => {
        const sql = m.default('${url}');
        sql\\\`SELECT 1\\\`.then(() => { sql.end(); process.exit(0); })
          .catch(() => { sql.end(); process.exit(1); });
      });
    "`, { stdio: 'ignore', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] ?? 'start';

  if (command === '--help' || command === '-h') {
    console.log(BANNER);
    console.log('  Usage: traces [command]\n');
    console.log('  Commands:');
    console.log('    start        Start the Traces server (default)');
    console.log('    setup        Interactive setup wizard');
    console.log('    --help, -h   Show this help\n');
    console.log('  Environment:');
    console.log('    DATABASE_URL   PostgreSQL connection string');
    console.log('    TRACES_PORT    Server port (default: 3100)');
    console.log('    LOG_LEVEL      debug | info | warn | error\n');
    process.exit(0);
  }

  if (command === 'setup') {
    console.log(BANNER);
    console.log('  Interactive Setup\n');

    const dbUrl = await prompt('PostgreSQL URL', 'postgresql://localhost:5432/traces');
    const port = await prompt('Server port', '3100');

    console.log(`\n  Configuration:`);
    console.log(`    DATABASE_URL=${dbUrl}`);
    console.log(`    TRACES_PORT=${port}`);
    console.log(`\n  To start: DATABASE_URL="${dbUrl}" TRACES_PORT=${port} traces start\n`);
    process.exit(0);
  }

  // Default: start
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/traces';
  process.env.TRACES_PORT = process.env.TRACES_PORT ?? '3100';

  const { start } = await import('../src/server.js');
  await start();
}

main().catch((err) => {
  console.error('\n  Failed to start Traces:', err.message);
  console.error('  Make sure PostgreSQL is running and DATABASE_URL is correct.\n');
  process.exit(1);
});
