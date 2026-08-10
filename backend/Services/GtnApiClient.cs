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

    public GtnApiClient(IHttpClientFactory factory, GtnAuthService auth, IOptions<GtnOptions> options)
    {
        _options = options.Value;
        _trade = factory.CreateClient();
        _trade.BaseAddress = new Uri(_options.TradeBaseUrl.TrimEnd('/') + "/");
        _marketData = factory.CreateClient();
        _marketData.BaseAddress = new Uri(_options.MarketDataBaseUrl.TrimEnd('/') + "/");
        _auth = auth;
    }

    public async Task<HttpResponseMessage> TradeRequestAsync(HttpMethod method, string path, object? jsonBody = null, CancellationToken ct = default)
    {
        var token = await _auth.GetAccessTokenAsync(ct);
        using var request = new HttpRequestMessage(method, path.TrimStart('/'));
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Headers.Add("Throttle-Key", _options.AppKey);
        if (jsonBody is not null)
            request.Content = JsonContent.Create(jsonBody);

        return await _trade.SendAsync(request, ct);
    }

    public async Task<HttpResponseMessage> MarketDataRequestAsync(HttpMethod method, string path, CancellationToken ct = default)
    {
        var token = await _auth.GetAccessTokenAsync(ct);
        using var request = new HttpRequestMessage(method, path.TrimStart('/'));
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Headers.Add("Throttle-Key", _options.AppKey);

        return await _marketData.SendAsync(request, ct);
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
        return await client.SendAsync(request, ct);
    }
}
