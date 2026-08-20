using System.Net.WebSockets;
using System.Text;
using GtnTrading.Api;
using GtnTrading.Api.Services;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.Extensions.Options;
using Serilog;
using Serilog.Events;

// Errors/warnings (real exceptions plus GTN request failures logged by GtnApiClient)
// go to logs/errors-.log so they survive past whatever's in the console/Render's log
// tail. Console keeps everything at Information+ for normal request tracing.
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/errors-.log",
        restrictedToMinimumLevel: LogEventLevel.Warning,
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 14,
        shared: true)
    .CreateLogger();

try
{

var builder = WebApplication.CreateBuilder(args);
builder.Host.UseSerilog();

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

// Independent of ASPNETCORE_ENVIRONMENT so Swagger can be turned on for an internal
// IIS deployment (set EnableSwagger=true in appsettings.Production.json or as an IIS
// environment variable) without having to run the whole app in Development mode.
if (app.Environment.IsDevelopment() || builder.Configuration.GetValue<bool>("EnableSwagger"))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Catches anything that escapes a controller/middleware unhandled, logs it to
// logs/errors-.log with full stack trace, and returns a plain JSON 500 instead of
// crashing the request or leaking a stack trace to the client.
app.UseExceptionHandler(errApp => errApp.Run(async context =>
{
    var error = context.Features.Get<IExceptionHandlerFeature>()?.Error;
    Log.Error(error, "Unhandled exception on {Method} {Path}", context.Request.Method, context.Request.Path);
    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
    context.Response.ContentType = "application/json";
    await context.Response.WriteAsync("""{"error":"Internal Server Error"}""");
}));

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

// GTN's market-data WebSocket (MarketDataWsUrl) is unusable — it throws a real
// server-side error on auth every time it's tried (confirmed live, different NPE
// messages on different attempts, same 1011 internal-error category — a bug on GTN's
// side, not fixable here). Rather than force clients to poll GET /api/marketdata/quotes
// themselves, this endpoint does the polling once on the server (one shared loop
// per connection, ~4s interval) and pushes updates over a real WebSocket — clients get
// a genuine live-push experience even though the upstream source is polled REST.
app.Map("/ws/quotes", async context =>
{
    if (!context.WebSockets.IsWebSocketRequest)
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        return;
    }

    var keys = context.Request.Query["keys"].ToString();
    if (string.IsNullOrWhiteSpace(keys))
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        return;
    }

    var gtn = context.RequestServices.GetRequiredService<GtnApiClient>();
    using var socket = await context.WebSockets.AcceptWebSocketAsync();
    var ct = context.RequestAborted;

    // Matches the REST GET /api/marketdata/quotes shape (ASP.NET Core's MVC formatter
    // camelCases by default) since mobile's Quote interface/parsing is shared between both.
    var jsonOptions = new System.Text.Json.JsonSerializerOptions
    {
        PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase
    };

    try
    {
        while (socket.State == WebSocketState.Open && !ct.IsCancellationRequested)
        {
            var quotes = await QuoteFetcher.FetchAsync(gtn, keys, ct);
            var payload = Encoding.UTF8.GetBytes(System.Text.Json.JsonSerializer.Serialize(new { quotes }, jsonOptions));
            await socket.SendAsync(payload, WebSocketMessageType.Text, true, ct);
            await Task.Delay(TimeSpan.FromSeconds(4), ct);
        }
    }
    catch (OperationCanceledException) { /* client disconnected */ }
    finally
    {
        if (socket.State == WebSocketState.Open)
            await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "done", CancellationToken.None);
    }
});

app.Run();

}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
