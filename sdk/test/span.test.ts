import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpanBuilder } from '../src/span.js';

function mockClient() {
  return {
    enqueueSpan: vi.fn(),
    createTrace: vi.fn(),
    sendSpan: vi.fn(),
    flush: vi.fn(),
    destroy: vi.fn(),
  } as any;
}

describe('SpanBuilder', () => {
  let client: ReturnType<typeof mockClient>;

  beforeEach(() => {
    client = mockClient();
  });

  it('creates a span with basic options', () => {
    const span = new SpanBuilder(client, {
      traceId: 'trace-1',
      name: 'test-span',
      model: 'gpt-4o',
      provider: 'openai',
    });

    span.end();

    expect(client.enqueueSpan).toHaveBeenCalledOnce();
    const data = client.enqueueSpan.mock.calls[0][0];
    expect(data.traceId).toBe('trace-1');
    expect(data.name).toBe('test-span');
    expect(data.model).toBe('gpt-4o');
    expect(data.provider).toBe('openai');
    expect(data.latencyMs).toBeGreaterThanOrEqual(0);
    expect(data.endedAt).toBeTruthy();
    expect(data.startedAt).toBeTruthy();
  });

  it('supports fluent input/output/tokens chain', () => {
    const span = new SpanBuilder(client, { traceId: 'trace-1' });

    span
      .input({ messages: [{ role: 'user', content: 'hi' }] })
      .output({ content: 'hello' })
      .tokens(10, 5)
      .end();

    const data = client.enqueueSpan.mock.calls[0][0];
    expect(data.input).toEqual({ messages: [{ role: 'user', content: 'hi' }] });
    expect(data.output).toEqual({ content: 'hello' });
    expect(data.inputTokens).toBe(10);
    expect(data.outputTokens).toBe(5);
    expect(data.totalTokens).toBe(15);
  });

  it('supports error marking', () => {
    const span = new SpanBuilder(client, { traceId: 'trace-1' });

    span.error('Something went wrong').end();

    const data = client.enqueueSpan.mock.calls[0][0];
    expect(data.status).toBe('error');
    expect(data.error).toBe('Something went wrong');
  });

  it('supports error from Error object', () => {
    const span = new SpanBuilder(client, { traceId: 'trace-1' });

    span.error(new Error('Network timeout')).end();

    const data = client.enqueueSpan.mock.calls[0][0];
    expect(data.error).toBe('Network timeout');
  });

  it('supports metadata via meta()', () => {
    const span = new SpanBuilder(client, { traceId: 'trace-1' });

    span
      .meta('persona', 'sri')
      .meta('costUsd', 0.001)
      .end();

    const data = client.enqueueSpan.mock.calls[0][0];
    expect(data.metadata).toEqual({ persona: 'sri', costUsd: 0.001 });
  });

  it('merges metadata with initial metadata', () => {
    const span = new SpanBuilder(client, {
      traceId: 'trace-1',
      metadata: { existing: true },
    });

    span.meta('added', 'value').end();

    const data = client.enqueueSpan.mock.calls[0][0];
    expect(data.metadata).toEqual({ existing: true, added: 'value' });
  });

  it('does not enqueue before end() is called', () => {
    const span = new SpanBuilder(client, { traceId: 'trace-1' });
    span.input({ test: true }).output({ test: true }).tokens(1, 1);

    expect(client.enqueueSpan).not.toHaveBeenCalled();

    span.end();
    expect(client.enqueueSpan).toHaveBeenCalledOnce();
  });
});
