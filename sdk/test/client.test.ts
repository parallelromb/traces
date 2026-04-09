import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TracesClient } from '../src/client.js';

describe('TracesClient', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'test-id' }),
      text: () => Promise.resolve(''),
    });
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets default baseUrl', () => {
    const client = new TracesClient({});
    client.enqueueSpan({ traceId: 'trace-1', name: 'test' });
    client.flush();

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3100/api/spans',
      expect.any(Object),
    );
    client.destroy();
  });

  it('sets Authorization header when secretKey is provided', async () => {
    const client = new TracesClient({ secretKey: 'sk-trc-test123' });
    await client.createTrace({ name: 'test' });

    const [, opts] = fetchSpy.mock.calls[0];
    expect(opts.headers.Authorization).toBe('Bearer sk-trc-test123');
    client.destroy();
  });

  it('sets X-Traces-Public-Key header when publicKey is provided', async () => {
    const client = new TracesClient({ publicKey: 'pk-trc-test123' });
    await client.createTrace({ name: 'test' });

    const [, opts] = fetchSpy.mock.calls[0];
    expect(opts.headers['X-Traces-Public-Key']).toBe('pk-trc-test123');
    client.destroy();
  });

  it('enqueues spans and flushes as batch', async () => {
    const client = new TracesClient({ batchSize: 100, flushInterval: 60000 });

    client.enqueueSpan({ traceId: 'trace-1', name: 'span-1' });
    client.enqueueSpan({ traceId: 'trace-1', name: 'span-2' });
    client.enqueueSpan({ traceId: 'trace-2', name: 'span-3' });

    await client.flush();

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe('http://localhost:3100/api/spans');
    const body = JSON.parse(opts.body);
    expect(body).toHaveLength(3);
    expect(body[0].name).toBe('span-1');
    expect(body[2].traceId).toBe('trace-2');
    client.destroy();
  });

  it('auto-flushes when batchSize is reached', () => {
    const client = new TracesClient({ batchSize: 2, flushInterval: 60000 });

    client.enqueueSpan({ traceId: 't', name: 'span-1' });
    expect(fetchSpy).not.toHaveBeenCalled();

    client.enqueueSpan({ traceId: 't', name: 'span-2' });
    // flush is called synchronously when batch size reached
    expect(fetchSpy).toHaveBeenCalled();
    client.destroy();
  });

  it('does not flush when queue is empty', async () => {
    const client = new TracesClient({});
    await client.flush();
    expect(fetchSpy).not.toHaveBeenCalled();
    client.destroy();
  });

  it('strips trailing slash from baseUrl', () => {
    const client = new TracesClient({ baseUrl: 'http://example.com/' });
    client.enqueueSpan({ traceId: 'trace-1', name: 'test' });
    client.flush();

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://example.com/api/spans',
      expect.any(Object),
    );
    client.destroy();
  });

  it('createTrace sends POST to /api/traces', async () => {
    const client = new TracesClient({});
    const result = await client.createTrace({ name: 'my-trace', userId: 'user-1' });

    expect(result).toEqual({ id: 'test-id' });
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe('http://localhost:3100/api/traces');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body.name).toBe('my-trace');
    expect(body.userId).toBe('user-1');
    client.destroy();
  });
});
