export const config = {
  port: parseInt(process.env.TRACES_PORT ?? '3100', 10),
  host: process.env.TRACES_HOST ?? '0.0.0.0',
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/traces',
  logLevel: (process.env.LOG_LEVEL ?? 'info') as 'debug' | 'info' | 'warn' | 'error',
  defaultProjectName: process.env.TRACES_PROJECT ?? 'default',
};
