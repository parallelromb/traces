import { TracesClient } from './client.js';
import { nanoid } from 'nanoid';

export type SpanOptions = {
  name?: string;
  model?: string;
  provider?: string;
  traceId: string;
  parentId?: string;
  metadata?: any;
};

export class SpanBuilder {
  private client: TracesClient;
  private data: { traceId: string; [key: string]: any };
  private startTime: number;

  constructor(client: TracesClient, opts: SpanOptions) {
    this.client = client;
    this.startTime = Date.now();
    this.data = {
      traceId: opts.traceId,
      parentId: opts.parentId ?? null,
      name: opts.name ?? null,
      model: opts.model ?? null,
      provider: opts.provider ?? null,
      metadata: opts.metadata ?? null,
      startedAt: new Date().toISOString(),
    };
  }

  input(data: any): this {
    this.data.input = data;
    return this;
  }

  output(data: any): this {
    this.data.output = data;
    return this;
  }

  tokens(input: number, output: number): this {
    this.data.inputTokens = input;
    this.data.outputTokens = output;
    this.data.totalTokens = input + output;
    return this;
  }

  error(err: string | Error): this {
    this.data.status = 'error';
    this.data.error = typeof err === 'string' ? err : err.message;
    return this;
  }

  meta(key: string, value: any): this {
    this.data.metadata = { ...(this.data.metadata ?? {}), [key]: value };
    return this;
  }

  end(): void {
    this.data.endedAt = new Date().toISOString();
    this.data.latencyMs = Date.now() - this.startTime;
    this.client.enqueueSpan(this.data);
  }
}
