import { TracesClient, TracesConfig } from './client.js';
import { SpanBuilder, SpanOptions } from './span.js';
import { TraceBuilder, TraceOptions } from './trace.js';
import { wrapClient } from './wrap.js';

export class Traces {
  private client: TracesClient;

  constructor(config?: TracesConfig) {
    this.client = new TracesClient(config ?? {});
  }

  // Auto-instrument any OpenAI-compatible client
  wrap<T extends object>(apiClient: T, opts?: {
    traceId?: string;
    traceName?: string;
    userId?: string;
    sessionId?: string;
  }): T {
    return wrapClient(apiClient, this.client, opts);
  }

  // Create a trace (groups related spans)
  async trace(opts?: TraceOptions): Promise<TraceBuilder> {
    return TraceBuilder.create(this.client, opts ?? {});
  }

  // Create a standalone span
  span(opts: SpanOptions): SpanBuilder {
    return new SpanBuilder(this.client, opts);
  }

  // Flush pending spans
  async flush(): Promise<void> {
    await this.client.flush();
  }

  // Cleanup
  destroy(): void {
    this.client.destroy();
  }
}

export { TracesClient, TracesConfig } from './client.js';
export { SpanBuilder, SpanOptions } from './span.js';
export { TraceBuilder, TraceOptions } from './trace.js';
