export interface Env {
  SIGNALING: DurableObjectNamespace;
  METERED_API_KEY: string;
}

// TURN cache — refreshed every 12h
let turnCache: { iceServers: unknown[] } | null = null;
let turnCacheTime = 0;
const TURN_CACHE_TTL = 12 * 60 * 60 * 1000;

async function getTurnCredentials(apiKey: string): Promise<{ iceServers: unknown[] }> {
  const now = Date.now();
  if (turnCache && now - turnCacheTime < TURN_CACHE_TTL) return turnCache;
  if (!apiKey) return { iceServers: [] };
  try {
    const res = await fetch(
      `https://ootmmr-checklist-mobby45.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`
    );
    if (!res.ok) return { iceServers: [] };
    const data = await res.json() as unknown[];
    turnCache = { iceServers: data };
    turnCacheTime = now;
    return turnCache;
  } catch {
    return { iceServers: [] };
  }
}

export class SignalingHub {
  private topics = new Map<string, Set<WebSocket>>();

  constructor(private state: DurableObjectState, private env: Env) {}

  async fetch(req: Request): Promise<Response> {
    if (req.headers.get('upgrade') !== 'websocket') {
      return new Response('SignalingHub', { status: 200 });
    }
    const { 0: client, 1: server } = new WebSocketPair();
    this.state.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    let data: any;
    try { data = JSON.parse(message as string); } catch { return; }

    if (data.type === 'ping') {
      try { ws.send(JSON.stringify({ type: 'pong' })); } catch { /* closed */ }
      return;
    }

    if (data.type === 'subscribe') {
      for (const t of (data.topics ?? [])) {
        if (!this.topics.has(t)) this.topics.set(t, new Set());
        this.topics.get(t)!.add(ws);
      }
    } else if (data.type === 'unsubscribe') {
      for (const t of (data.topics ?? [])) {
        this.topics.get(t)?.delete(ws);
        if (this.topics.get(t)?.size === 0) this.topics.delete(t);
      }
    } else if (
      data.type === 'publish' || data.type === 'yjsUpdate' ||
      data.type === 'yjsSyncRequest' || data.type === 'yjsSyncResponse'
    ) {
      if (data.type === 'yjsSyncRequest') {
        this.forwardToOne(data.topic, data, ws);
      } else {
        this.broadcast(data.topic, data, ws);
      }
    }
  }

  async webSocketClose(ws: WebSocket) {
    this.topics.forEach((sockets, topic) => {
      sockets.delete(ws);
      if (sockets.size === 0) this.topics.delete(topic);
    });
  }

  async webSocketError(ws: WebSocket) {
    await this.webSocketClose(ws);
  }

  private broadcast(topic: string, data: unknown, exclude: WebSocket) {
    const msg = JSON.stringify(data);
    this.topics.get(topic)?.forEach(ws => {
      if (ws !== exclude) try { ws.send(msg); } catch { /* closed */ }
    });
  }

  private forwardToOne(topic: string, data: unknown, exclude: WebSocket): boolean {
    const msg = JSON.stringify(data);
    for (const ws of this.topics.get(topic) ?? []) {
      if (ws !== exclude) {
        try { ws.send(msg); return true; } catch { /* closed */ }
      }
    }
    return false;
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === '/api/turn-credentials' && req.method === 'GET') {
      const creds = await getTurnCredentials(env.METERED_API_KEY ?? '');
      return new Response(JSON.stringify(creds), {
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
      });
    }

    if (req.headers.get('upgrade') === 'websocket') {
      const id = env.SIGNALING.idFromName('hub');
      const stub = env.SIGNALING.get(id);
      return stub.fetch(req);
    }

    return new Response('y-webrtc signaling server', { status: 200 });
  },
};
