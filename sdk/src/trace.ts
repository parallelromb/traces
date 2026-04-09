import { TracesClient } from './client.js';
import { SpanBuilder, SpanOptions } from './span.js';

export type TraceOptions = {
  name?: string;
  userId?: string;
  sessionId?: string;
  metadata?: any;
  id?: string;
};

export class TraceBuilder {
  private client: TracesClient;
  public readonly id: string;
  private created: boolean = false;
  private opts: TraceOptions;

  constructor(client: TracesClient, opts: TraceOptions, id: string) {
    this.client = client;
    this.opts = opts;
    this.id = id;
  }

  static async create(client: TracesClient, opts: TraceOptions): Promise<TraceBuilder> {
    const result = await client.createTrace(opts) as { id: string };
    return new TraceBuilder(client, opts, result.id);
  }

  span(opts: Omit<SpanOptions, 'traceId'>): SpanBuilder {
    return new SpanBuilder(this.client, { ...opts, traceId: this.id });
  }
}
