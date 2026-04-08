import { TracesClient } from './client.js';
import { nanoid } from 'nanoid';

type WrapOptions = {
  traceId?: string;
  traceName?: string;
  userId?: string;
  sessionId?: string;
};

// Wraps an OpenAI-compatible client to auto-instrument all chat/completion calls
export function wrapClient<T extends object>(
  client: T,
  tracesClient: TracesClient,
  opts?: WrapOptions,
): T {
  return new Proxy(client, {
    get(target: any, prop: string) {
      const value = target[prop];

      // Intercept nested objects (e.g., client.chat.completions)
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return wrapClient(value, tracesClient, opts);
      }

      // Intercept function calls
      if (typeof value === 'function' && prop === 'create') {
        return async function wrappedCreate(...args: any[]) {
          const startTime = Date.now();
          let traceId = opts?.traceId;

          // Auto-create trace if not provided
          if (!traceId) {
            const trace = await tracesClient.createTrace({
              name: opts?.traceName ?? 'auto',
              userId: opts?.userId,
              sessionId: opts?.sessionId,
            });
            traceId = trace.id;
          }

          const params = args[0] ?? {};

          try {
            const result = await value.apply(target, args);
            const latencyMs = Date.now() - startTime;

            // Extract usage from response
            const usage = result?.usage ?? {};
            const model = result?.model ?? params.model ?? 'unknown';

            tracesClient.enqueueSpan({
              traceId,
              name: `${prop}`,
              model,
              input: { messages: params.messages },
              output: {
                content: result?.choices?.[0]?.message?.content
                  ?? result?.content?.[0]?.text
                  ?? null,
              },
              inputTokens: usage.prompt_tokens ?? usage.input_tokens ?? 0,
              outputTokens: usage.completion_tokens ?? usage.output_tokens ?? 0,
              latencyMs,
              status: 'ok',
              startedAt: new Date(startTime).toISOString(),
              endedAt: new Date().toISOString(),
            });

            return result;
          } catch (err: any) {
            const latencyMs = Date.now() - startTime;

            tracesClient.enqueueSpan({
              traceId,
              name: `${prop}`,
              model: params.model ?? 'unknown',
              input: { messages: params.messages },
              status: 'error',
              error: err.message,
              latencyMs,
              startedAt: new Date(startTime).toISOString(),
              endedAt: new Date().toISOString(),
            });

            throw err;
          }
        };
      }

      return value;
    },
  });
}
