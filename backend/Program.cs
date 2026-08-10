using System.Net.WebSockets;
using System.Text;
using GtnTrading.Api;
using GtnTrading.Api.Services;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddOptions<GtnOptions>()
    .Bind(builder.Configuration.GetSection(GtnOptions.SectionName))
    .ValidateDataAnnotations();

// GTN's sandbox sits behind a WAF that silently black-holes requests without a
// browser-like User-Agent (rather than a fast reject), so give every outbound
// client one. Configuring the unnamed/default client covers CreateClient() and
// plain HttpClient DI injection alike.
builder.Services.AddHttpClient(string.Empty, client =>
{
    client.DefaultRequestHeaders.UserAgent.ParseAdd(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
});
builder.Services.AddSingleton<GtnAuthService>();
builder.Services.AddScoped<GtnApiClient>();

const string FrontendCors = "FrontendCors";
builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCors, policy =>
    {
        policy.WithOrigins(builder.Configuration["Frontend:Origin"] ?? "http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors(FrontendCors);
app.UseWebSockets();
app.UseAuthorization();
app.MapControllers();

// GTN's trade events aren't SSE (the documented /trade/stream endpoint 400s with no
// documented params) — they're pushed over a raw WebSocket at TradeStreamWsUrl. The
// handshake accepts unauthenticated connections; auth happens by sending
// {"token": "<accessToken>"} as the first text frame, after which order/trade events
// for the institution are pushed automatically (no subscribe message required, at
// least in the sandbox). This endpoint proxies that so the browser never sees the
// GTN token.
app.Map("/ws/trade", async context =>
{
    if (!context.WebSockets.IsWebSocketRequest)
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        return;
    }

    var auth = context.RequestServices.GetRequiredService<GtnAuthService>();
    var options = context.RequestServices.GetRequiredService<IOptions<GtnOptions>>().Value;

    using var browserSocket = await context.WebSockets.AcceptWebSocketAsync();
    using var gtnSocket = new ClientWebSocket();
    gtnSocket.Options.SetRequestHeader("User-Agent",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");

    var ct = context.RequestAborted;
    try
    {
        await gtnSocket.ConnectAsync(new Uri(options.TradeStreamWsUrl), ct);

        var token = await auth.GetAccessTokenAsync(ct);
        var authFrame = Encoding.UTF8.GetBytes(System.Text.Json.JsonSerializer.Serialize(new { token }));
        await gtnSocket.SendAsync(authFrame, WebSocketMessageType.Text, true, ct);

        var buffer = new byte[16 * 1024];
        while (gtnSocket.State == WebSocketState.Open && browserSocket.State == WebSocketState.Open)
        {
            var result = await gtnSocket.ReceiveAsync(buffer, ct);
            if (result.MessageType == WebSocketMessageType.Close) break;

            await browserSocket.SendAsync(
                new ArraySegment<byte>(buffer, 0, result.Count),
                WebSocketMessageType.Text, result.EndOfMessage, ct);
        }
    }
    catch (OperationCanceledException) { /* client disconnected */ }
    finally
    {
        if (gtnSocket.State == WebSocketState.Open)
            await gtnSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "done", CancellationToken.None);
        if (browserSocket.State == WebSocketState.Open)
            await browserSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "done", CancellationToken.None);
    }
});

app.Run();
