using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.Options;

namespace GtnTrading.Api.Services;

/// <summary>Thin wrapper that attaches a fresh GTN bearer token + Throttle-Key to every call.</summary>
public class GtnApiClient
{
    private readonly HttpClient _trade;
    private readonly HttpClient _marketData;
    private readonly GtnAuthService _auth;
    private readonly GtnOptions _options;
    private readonly ILogger<GtnApiClient> _logger;

    public GtnApiClient(IHttpClientFactory factory, GtnAuthService auth, IOptions<GtnOptions> options, ILogger<GtnApiClient> logger)
    {
        _options = options.Value;
        _trade = factory.CreateClient();
        _trade.BaseAddress = new Uri(_options.TradeBaseUrl.TrimEnd('/') + "/");
        _marketData = factory.CreateClient();
        _marketData.BaseAddress = new Uri(_options.MarketDataBaseUrl.TrimEnd('/') + "/");
        _auth = auth;
        _logger = logger;
    }

    public async Task<HttpResponseMessage> TradeRequestAsync(HttpMethod method, string path, object? jsonBody = null, CancellationToken ct = default)
    {
        var token = await _auth.GetAccessTokenAsync(ct);
        using var request = new HttpRequestMessage(method, path.TrimStart('/'));
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Headers.Add("Throttle-Key", _options.AppKey);
        if (jsonBody is not null)
            request.Content = JsonContent.Create(jsonBody);

        var response = await _trade.SendAsync(request, ct);
        await LogIfError(response, method, path, ct);
        return response;
    }

    public async Task<HttpResponseMessage> MarketDataRequestAsync(HttpMethod method, string path, CancellationToken ct = default)
    {
        var token = await _auth.GetAccessTokenAsync(ct);
        using var request = new HttpRequestMessage(method, path.TrimStart('/'));
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Headers.Add("Throttle-Key", _options.AppKey);

        var response = await _marketData.SendAsync(request, ct);
        await LogIfError(response, method, path, ct);
        return response;
    }

    /// <summary>Generic authenticated forward for any GTN path/method/body — backs GtnProxyController.</summary>
    public async Task<HttpResponseMessage> ProxyAsync(
        bool marketData, HttpMethod method, string pathAndQuery, byte[]? body, string? contentType, CancellationToken ct = default)
    {
        var token = await _auth.GetAccessTokenAsync(ct);
        using var request = new HttpRequestMessage(method, pathAndQuery.TrimStart('/'));
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Headers.Add("Throttle-Key", _options.AppKey);
        if (body is { Length: > 0 })
        {
            request.Content = new ByteArrayContent(body);
            request.Content.Headers.ContentType = new MediaTypeHeaderValue(contentType ?? "application/json");
        }

        var client = marketData ? _marketData : _trade;
        var response = await client.SendAsync(request, ct);
        await LogIfError(response, method, pathAndQuery, ct);
        return response;
    }

    // GTN's error responses (401/403/400 from bad params, missing entitlements, etc.)
    // are the actual "errors" this app hits most often — far more than unhandled C#
    // exceptions — so they're worth their own log line. ReadAsStringAsync buffers the
    // content, so controllers can still read the body afterward.
    private async Task LogIfError(HttpResponseMessage response, HttpMethod method, string path, CancellationToken ct)
    {
        if (response.IsSuccessStatusCode) return;
        var body = await response.Content.ReadAsStringAsync(ct);
        _logger.LogWarning("GTN request failed: {Method} {Path} -> {StatusCode} {Body}",
            method, path, (int)response.StatusCode, body);
    }
}
