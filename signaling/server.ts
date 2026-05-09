const topics = new Map<string, Set<WebSocket>>();

function setupConn(ws: WebSocket) {
  const subscribedTopics = new Set<string>();
  let pongReceived = true;

  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      ws.close();
      clearInterval(pingInterval);
    } else {
      pongReceived = false;
      try { ws.send(JSON.stringify({ type: 'ping' })); } catch { /* closed */ }
    }
  }, 30000);

  ws.onclose = () => {
    clearInterval(pingInterval);
    subscribedTopics.forEach(t => {
      topics.get(t)?.delete(ws);
      if (topics.get(t)?.size === 0) topics.delete(t);
    });
  };

  ws.onmessage = (e) => {
    let data: any;
    try { data = JSON.parse(e.data as string); } catch { return; }

    if (data.type === 'pong') { pongReceived = true; return; }

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
      topics.get(data.topic)?.forEach(receiver => {
        if (receiver !== ws && receiver.readyState === WebSocket.OPEN) {
          receiver.send(JSON.stringify(data));
        }
      });
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
