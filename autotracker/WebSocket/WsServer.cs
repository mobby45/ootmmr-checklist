using System.Diagnostics.CodeAnalysis;
using System.Net;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace Autotracker.WebSocket;

sealed class WsServer
{
    readonly int _port;
    readonly List<System.Net.WebSockets.WebSocket> _clients = [];
    readonly SemaphoreSlim _lock = new(1, 1);

    // Called on the WebSocket accept task each time a new client connects or sends {"type":"resync"}.
    // Used to trigger a snapshot reset in MemoryPoller so all current state is re-broadcast.
    public Action? OnClientConnected { get; set; }
    public Action? OnResyncRequested { get; set; }

    public WsServer(int port = 8338)
    {
        _port = port;
    }

    public async Task RunAsync(CancellationToken ct)
    {
        var listener = new HttpListener();
        listener.Prefixes.Add($"http://localhost:{_port}/");
        listener.Start();
        Console.WriteLine($"[autotracker] WebSocket server listening on ws://localhost:{_port}/");

        while (!ct.IsCancellationRequested)
        {
            HttpListenerContext ctx;
            try { ctx = await listener.GetContextAsync().WaitAsync(ct); }
            catch (OperationCanceledException) { break; }

            if (!ctx.Request.IsWebSocketRequest)
            {
                ctx.Response.StatusCode = 400;
                ctx.Response.Close();
                continue;
            }

            _ = HandleClientAsync(ctx, ct);
        }

        listener.Stop();
    }

    async Task HandleClientAsync(HttpListenerContext ctx, CancellationToken ct)
    {
        var wsCtx = await ctx.AcceptWebSocketAsync(null);
        var ws = wsCtx.WebSocket;

        await _lock.WaitAsync(ct);
        _clients.Add(ws);
        _lock.Release();

        Console.WriteLine($"[autotracker] Client connected ({_clients.Count} total)");
        OnClientConnected?.Invoke();

        try
        {
            var buf = new byte[1024];
            while (ws.State == WebSocketState.Open && !ct.IsCancellationRequested)
            {
                var result = await ws.ReceiveAsync(buf, ct);
                if (result.MessageType == WebSocketMessageType.Close)
                    break;
                if (result.MessageType == WebSocketMessageType.Text)
                {
                    var text = Encoding.UTF8.GetString(buf, 0, result.Count);
                    try
                    {
                        using var doc = JsonDocument.Parse(text);
                        if (doc.RootElement.TryGetProperty("type", out var t) && t.GetString() == "resync")
                            OnResyncRequested?.Invoke();
                    }
                    catch { }
                }
            }
        }
        catch { }
        finally
        {
            await _lock.WaitAsync(CancellationToken.None);
            _clients.Remove(ws);
            _lock.Release();
            Console.WriteLine($"[autotracker] Client disconnected ({_clients.Count} remaining)");
        }
    }

    [UnconditionalSuppressMessage("Trimming", "IL2026",
        Justification = "JsonSerializerIsReflectionEnabledByDefault=true preserves reflection at runtime.")]
    public async Task BroadcastAsync(object message)
    {
        var json = JsonSerializer.Serialize(message);
        var bytes = Encoding.UTF8.GetBytes(json);
        var segment = new ArraySegment<byte>(bytes);

        await _lock.WaitAsync();
        var snapshot = _clients.ToArray();
        _lock.Release();

        foreach (var ws in snapshot)
        {
            if (ws.State != WebSocketState.Open) continue;
            try { await ws.SendAsync(segment, WebSocketMessageType.Text, true, CancellationToken.None); }
            catch { }
        }
    }
}
