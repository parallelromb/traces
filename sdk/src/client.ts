export type TracesConfig = {
  baseUrl?: string;
  secretKey?: string;
  publicKey?: string;
  batchSize?: number;
  flushInterval?: number;
};

type PendingSpan = {
  traceId: string;
  [key: string]: any;
};

export class TracesClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  private queue: PendingSpan[] = [];
  private batchSize: number;
  private flushInterval: number;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(config: TracesConfig) {
    this.baseUrl = (config.baseUrl ?? 'http://localhost:3100').replace(/\/$/, '');
    this.batchSize = config.batchSize ?? 10;
    this.flushInterval = config.flushInterval ?? 5000;

    this.headers = { 'Content-Type': 'application/json' };
    if (config.secretKey) {
      this.headers['Authorization'] = `Bearer ${config.secretKey}`;
    } else if (config.publicKey) {
      this.headers['X-Traces-Public-Key'] = config.publicKey;
    }

    // Auto-flush timer
    this.timer = setInterval(() => this.flush(), this.flushInterval);

    // Flush on process exit
    if (typeof process !== 'undefined') {
      process.on('beforeExit', () => this.flush());
    }
  }

  async createTrace(data: { name?: string; userId?: string; sessionId?: string; metadata?: any; id?: string }) {
    const res = await fetch(`${this.baseUrl}/api/traces`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Traces API error: ${res.status} ${await res.text()}`);
    return res.json();
  }

  enqueueSpan(span: PendingSpan) {
    this.queue.push(span);
    if (this.queue.length >= this.batchSize) {
      this.flush();
    }
  }

  async sendSpan(span: PendingSpan) {
    const res = await fetch(`${this.baseUrl}/api/spans`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(span),
    });
    if (!res.ok) throw new Error(`Traces API error: ${res.status} ${await res.text()}`);
    return res.json();
  }

  async flush() {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0);
    try {
      await fetch(`${this.baseUrl}/api/spans`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(batch),
      });
    } catch (err) {
      // Re-queue on failure
      this.queue.unshift(...batch);
      console.error('[traces-sdk] Flush failed, will retry:', err);
    }
  }

  destroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.flush();
  }
}
