const topics = new Map<string, Set<WebSocket>>();

function broadcastToTopic(topic: string, data: any, exclude: WebSocket) {
  topics.get(topic)?.forEach(receiver => {
    if (receiver !== exclude && receiver.readyState === WebSocket.OPEN) {
      receiver.send(JSON.stringify(data));
    }
  });
}

function forwardToOneInTopic(topic: string, data: any, exclude: WebSocket) {
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
    } else if (data.type === 'unsubscribe') {
      for (const t of (data.topics ?? [])) {
        topics.get(t)?.delete(ws);
        if (topics.get(t)?.size === 0) topics.delete(t);
        subscribedTopics.delete(t);
      }
    } else if (data.type === 'publish') {
      broadcastToTopic(data.topic, data, ws);
    } else if (data.type === 'yjsUpdate') {
      // Incremental Yjs update — broadcast to all other peers in room
      broadcastToTopic(data.topic, data, ws);
    } else if (data.type === 'yjsSyncRequest') {
      // Full-state request — forward to exactly one other peer
      forwardToOneInTopic(data.topic, data, ws);
    } else if (data.type === 'yjsSyncResponse') {
      // Full-state response — broadcast to all other peers in room
      broadcastToTopic(data.topic, data, ws);
    }
  };
}

Deno.serve(req => {
  if (req.headers.get('upgrade') !== 'websocket') {
    return new Response('y-webrtc signaling server', { status: 200 });
  }
  const { socket, response } = Deno.upgradeWebSocket(req);
  setupConn(socket);
  return response;
});
