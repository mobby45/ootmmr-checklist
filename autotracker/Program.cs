using System.Threading.Channels;
using Autotracker.Tracker;
using Autotracker.WebSocket;

var cts = new CancellationTokenSource();
Console.CancelKeyPress += (_, e) => { e.Cancel = true; cts.Cancel(); };

var server = new WsServer(port: 8338);

// Messages are queued here and drained sequentially to guarantee ordering.
// WebSocket.SendAsync must not be called concurrently on the same socket.
var msgChannel = Channel.CreateUnbounded<object>(new UnboundedChannelOptions { SingleReader = true });

var poller = new MemoryPoller(msg => msgChannel.Writer.TryWrite(msg));
server.OnClientConnected  = poller.RequestReset;
server.OnResyncRequested  = poller.RequestReset;

async Task BroadcastLoop(CancellationToken ct)
{
    await foreach (var msg in msgChannel.Reader.ReadAllAsync(ct))
        await server.BroadcastAsync(msg);
}

Console.WriteLine("OoTMM Autotracker — press Ctrl+C to exit");

await Task.WhenAll(
    server.RunAsync(cts.Token),
    poller.RunAsync(cts.Token),
    BroadcastLoop(cts.Token)
);
