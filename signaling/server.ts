const topics = new Map<string, Set<WebSocket>>();
const xc = new BroadcastChannel('signaling');
const instanceId = crypto.randomUUID();

function broadcastToTopic(topic: string, data: any, exclude: WebSocket | null) {
  topics.get(topic)?.forEach(receiver => {
    if (receiver !== exclude && receiver.readyState === WebSocket.OPEN) {
      receiver.send(JSON.stringify(data));
    }
  });
}

function forwardToOneInTopic(topic: string, data: any, exclude: WebSocket | null) {
  for (const peer of topics.get(topic) ?? []) {
    if (peer !== exclude && peer.readyState === WebSocket.OPEN) {
      peer.send(JSON.stringify(data));
      return;
    }
  }
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
      // Broadcast via BC so other instances know about this connection
      xc.postMessage({ instanceId, type: '_peer_joined', topic: data.topics[0] });
    } else if (data.type === 'unsubscribe') {
      for (const t of (data.topics ?? [])) {
        topics.get(t)?.delete(ws);
        if (topics.get(t)?.size === 0) topics.delete(t);
        subscribedTopics.delete(t);
      }
    } else if (data.type === 'publish' || data.type === 'yjsUpdate' || data.type === 'yjsSyncRequest' || data.type === 'yjsSyncResponse') {
      // Broadcast locally with sender excluded
      if (data.type === 'publish' || data.type === 'yjsUpdate' || data.type === 'yjsSyncResponse') {
        broadcastToTopic(data.topic, data, ws);
      } else {
        forwardToOneInTopic(data.topic, data, ws);
      }
      // Relay to other instances (they'll broadcast to their local peers)
      xc.postMessage({ instanceId, topic: data.topic, data });
    }
  };
}

// Cross-instance relay: receive from other instances, broadcast locally
xc.onmessage = (e) => {
  const msg = e.data;
  // Skip messages from self (already broadcast locally above)
  if (msg.instanceId === instanceId) return;
  if (msg.type === '_peer_joined') return;
  if (msg.data.type === 'publish' || msg.data.type === 'yjsUpdate' || msg.data.type === 'yjsSyncResponse') {
    broadcastToTopic(msg.topic, msg.data, null);
  } else if (msg.data.type === 'yjsSyncRequest') {
    forwardToOneInTopic(msg.topic, msg.data, null);
  }
};

Deno.serve(req => {
  if (req.headers.get('upgrade') !== 'websocket') {
    return new Response('y-webrtc signaling server', { status: 200 });
  }
  const { socket, response } = Deno.upgradeWebSocket(req);
  setupConn(socket);
  return response;
});
