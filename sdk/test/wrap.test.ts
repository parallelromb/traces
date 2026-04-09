import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { wrapClient } from '../src/wrap.js';

function mockTracesClient() {
  return {
    enqueueSpan: vi.fn(),
    createTrace: vi.fn().mockResolvedValue({ id: 'auto-trace-id' }),
    flush: vi.fn(),
    destroy: vi.fn(),
  } as any;
}

describe('wrapClient', () => {
  let client: ReturnType<typeof mockTracesClient>;

  beforeEach(() => {
    client = mockTracesClient();
  });

  it('intercepts .create() calls on nested objects', async () => {
    const fakeOpenAI = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            model: 'gpt-4o',
            choices: [{ message: { content: 'Hello!' } }],
            usage: { prompt_tokens: 10, completion_tokens: 5 },
          }),
        },
      },
    };

    const wrapped = wrapClient(fakeOpenAI, client, { traceName: 'test' });

    const result = await wrapped.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hi' }],
    });

    expect(result.choices[0].message.content).toBe('Hello!');
    expect(fakeOpenAI.chat.completions.create).toHaveBeenCalledOnce();

    // Should have created a trace and enqueued a span
    expect(client.createTrace).toHaveBeenCalledOnce();
    expect(client.enqueueSpan).toHaveBeenCalledOnce();

    const span = client.enqueueSpan.mock.calls[0][0];
    expect(span.traceId).toBe('auto-trace-id');
    expect(span.model).toBe('gpt-4o');
    expect(span.inputTokens).toBe(10);
    expect(span.outputTokens).toBe(5);
    expect(span.status).toBe('ok');
    expect(span.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('uses provided traceId instead of creating new trace', async () => {
    const fakeClient = {
      create: vi.fn().mockResolvedValue({
        model: 'gpt-4o',
        choices: [{ message: { content: 'Hi' } }],
        usage: { prompt_tokens: 5, completion_tokens: 3 },
      }),
    };

    const wrapped = wrapClient(fakeClient, client, { traceId: 'existing-trace' });
    await wrapped.create({ model: 'gpt-4o', messages: [] });

    expect(client.createTrace).not.toHaveBeenCalled();
    expect(client.enqueueSpan.mock.calls[0][0].traceId).toBe('existing-trace');
  });

  it('records errors when create() throws', async () => {
    const fakeClient = {
      create: vi.fn().mockRejectedValue(new Error('Rate limited')),
    };

    const wrapped = wrapClient(fakeClient, client);

    await expect(wrapped.create({ model: 'gpt-4o', messages: [] }))
      .rejects.toThrow('Rate limited');

    expect(client.enqueueSpan).toHaveBeenCalledOnce();
    const span = client.enqueueSpan.mock.calls[0][0];
    expect(span.status).toBe('error');
    expect(span.error).toBe('Rate limited');
  });

  it('passes through non-create methods untouched', () => {
    const fakeClient = {
      someMethod: vi.fn().mockReturnValue('result'),
      someProperty: 42,
    };

    const wrapped = wrapClient(fakeClient, client);

    expect(wrapped.someMethod()).toBe('result');
    expect(wrapped.someProperty).toBe(42);
    expect(client.enqueueSpan).not.toHaveBeenCalled();
  });

  it('handles Anthropic-style response (content[].text)', async () => {
    const fakeClient = {
      create: vi.fn().mockResolvedValue({
        model: 'claude-sonnet-4-6',
        content: [{ text: 'Anthropic response' }],
        usage: { input_tokens: 20, output_tokens: 15 },
      }),
    };

    const wrapped = wrapClient(fakeClient, client);
    await wrapped.create({ model: 'claude-sonnet-4-6', messages: [] });

    const span = client.enqueueSpan.mock.calls[0][0];
    expect(span.output.content).toBe('Anthropic response');
    expect(span.inputTokens).toBe(20);
    expect(span.outputTokens).toBe(15);
  });
});
