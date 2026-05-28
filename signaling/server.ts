const topics = new Map<string, Set<WebSocket>>();

function broadcastToTopic(topic: string, data: any, exclude: WebSocket | null) {
  topics.get(topic)?.forEach(receiver => {
    if (receiver !== exclude && receiver.readyState === WebSocket.OPEN) {
      receiver.send(JSON.stringify(data));
    }
  });
}

function forwardToOneInTopic(topic: string, data: any, exclude: WebSocket | null): boolean {
  for (const peer of topics.get(topic) ?? []) {
    if (peer !== exclude && peer.readyState === WebSocket.OPEN) {
      peer.send(JSON.stringify(data));
      return true;
    }
  }
  return false;
}

function setupConn(ws: WebSocket) {
  const subscribedTopics = new Set<string>();

  ws.onclose = () => {
    subscribedTopics.forEach(t => {
      topics.get(t)?.delete(ws);
      if (topics.get(t)?.size === 0) topics.delete(t);
    });
  };

  ws.onmessage = (e) => {
    let data: any;
    try { data = JSON.parse(e.data as string); } catch { return; }

    if (data.type === 'ping') { try { ws.send(JSON.stringify({ type: 'pong' })); } catch { /* closed */ } return; }

    if (data.type === 'subscribe') {
      for (const t of (data.topics ?? [])) {
        if (!topics.has(t)) topics.set(t, new Set());
        topics.get(t)!.add(ws);
        subscribedTopics.add(t);
      }
    } else if (data.type === 'unsubscribe') {
      for (const t of (data.topics ?? [])) {
        topics.get(t)?.delete(ws);
        if (topics.get(t)?.size === 0) topics.delete(t);
        subscribedTopics.delete(t);
      }
    } else if (data.type === 'publish' || data.type === 'yjsUpdate' || data.type === 'yjsSyncRequest' || data.type === 'yjsSyncResponse') {
      if (data.type === 'yjsSyncRequest') {
        // Forward to one peer only to avoid multiple full-state responses
        forwardToOneInTopic(data.topic, data, ws);
      } else {
        broadcastToTopic(data.topic, data, ws);
      }
    }
  };
}

// TURN credentials cache (refresh every 12h)
let turnCache: { iceServers: any[] } | null = null;
let turnCacheTime = 0;
const TURN_CACHE_TTL = 12 * 60 * 60 * 1000;

async function getTurnCredentials(): Promise<{ iceServers: any[] }> {
  const now = Date.now();
  if (turnCache && now - turnCacheTime < TURN_CACHE_TTL) return turnCache;
  const apiKey = Deno.env.get('METERED_API_KEY');
  if (!apiKey) return { iceServers: [] };
  try {
    const res = await fetch(`https://ootmmr-checklist-mobby45.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`);
    if (!res.ok) return { iceServers: [] };
    const data = await res.json();
    turnCache = { iceServers: data };
    turnCacheTime = now;
    return { iceServers: data };
  } catch {
    return { iceServers: [] };
  }
}

const port = parseInt(Deno.env.get('PORT') ?? '8000');
Deno.serve({ port }, async req => {
  const url = new URL(req.url);
  if (url.pathname === '/api/turn-credentials' && req.method === 'GET') {
    const creds = await getTurnCredentials();
    return new Response(JSON.stringify(creds), {
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
    });
  }
  if (req.headers.get('upgrade') !== 'websocket') {
    return new Response('y-webrtc signaling server', { status: 200 });
  }
  const { socket, response } = Deno.upgradeWebSocket(req);
  setupConn(socket);
  return response;
});
