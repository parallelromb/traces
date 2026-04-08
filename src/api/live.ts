import { FastifyInstance } from 'fastify';

type LiveClient = {
  send: (data: string) => void;
  close: () => void;
};

class LiveFeed {
  private clients: Set<LiveClient> = new Set();

  add(client: LiveClient) {
    this.clients.add(client);
  }

  remove(client: LiveClient) {
    this.clients.delete(client);
  }

  broadcast(span: any) {
    const msg = JSON.stringify(span);
    for (const client of this.clients) {
      try {
        client.send(msg);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  get count() {
    return this.clients.size;
  }
}

export const liveFeed = new LiveFeed();

export async function liveRoutes(app: FastifyInstance) {
  // Store reference on app for ingest to use
  (app as any).liveFeed = liveFeed;

  app.get('/api/live', { websocket: true }, (socket, req) => {
    const client: LiveClient = {
      send: (data: string) => socket.send(data),
      close: () => socket.close(),
    };

    liveFeed.add(client);
    console.log(`[traces] Live client connected (${liveFeed.count} total)`);

    socket.on('close', () => {
      liveFeed.remove(client);
      console.log(`[traces] Live client disconnected (${liveFeed.count} total)`);
    });
  });
}
