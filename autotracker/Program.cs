using Autotracker.Tracker;
using Autotracker.WebSocket;

var cts = new CancellationTokenSource();
Console.CancelKeyPress += (_, e) => { e.Cancel = true; cts.Cancel(); };

var server = new WsServer(port: 8338);
var poller = new MemoryPoller(msg => _ = server.BroadcastAsync(msg));

Console.WriteLine("OoTMM Autotracker — press Ctrl+C to exit");

await Task.WhenAll(
    server.RunAsync(cts.Token),
    poller.RunAsync(cts.Token)
);
