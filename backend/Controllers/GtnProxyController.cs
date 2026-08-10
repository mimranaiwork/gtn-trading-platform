using GtnTrading.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace GtnTrading.Api.Controllers;

/// <summary>
/// Generic authenticated pass-through for the rest of the GTN Trade/Market-Data API —
/// onboarding, account management, funding, portfolio, reports, master data, EOD,
/// charts, news, etc. Path segments after "trade/" or "marketdata/" are forwarded
/// verbatim to GTN, e.g.:
///
///   GET  /api/gtn/trade/bo/v1.2/customer/accounts?pageNo=1&amp;pageWidth=20
///        -&gt; {TradeBaseUrl}/bo/v1.2/customer/accounts?pageNo=1&amp;pageWidth=20
///   POST /api/gtn/trade/bo/v1.2/customer/account   (body forwarded as-is)
///        -&gt; {TradeBaseUrl}/bo/v1.2/customer/account
///
/// Auth is injected server-side; callers never need a GTN token. See
/// docs/gtn-api-reference.md for the full path/method/body list, generated from
/// postman-collection-v1.2.1.json. Order placement and ticker lookups have dedicated,
/// typed controllers (OrdersController, MarketDataController) — prefer those where
/// they already cover what you need.
/// </summary>
[ApiController]
[Route("api/gtn")]
public class GtnProxyController : ControllerBase
{
    private readonly GtnApiClient _gtn;

    public GtnProxyController(GtnApiClient gtn)
    {
        _gtn = gtn;
    }

    [HttpGet("trade/{**path}")]
    [HttpPost("trade/{**path}")]
    [HttpPatch("trade/{**path}")]
    [HttpPut("trade/{**path}")]
    [HttpDelete("trade/{**path}")]
    public Task<IActionResult> Trade(string path, CancellationToken ct) => Proxy(marketData: false, path, ct);

    [HttpGet("marketdata/{**path}")]
    [HttpPost("marketdata/{**path}")]
    public Task<IActionResult> MarketData(string path, CancellationToken ct) => Proxy(marketData: true, path, ct);

    private async Task<IActionResult> Proxy(bool marketData, string path, CancellationToken ct)
    {
        byte[]? body = null;
        if (Request.ContentLength is > 0)
        {
            using var ms = new MemoryStream();
            await Request.Body.CopyToAsync(ms, ct);
            body = ms.ToArray();
        }

        var res = await _gtn.ProxyAsync(
            marketData,
            new HttpMethod(Request.Method),
            path + Request.QueryString,
            body,
            Request.ContentType,
            ct);

        var responseBody = await res.Content.ReadAsStringAsync(ct);
        return new ContentResult
        {
            StatusCode = (int)res.StatusCode,
            Content = responseBody,
            ContentType = res.Content.Headers.ContentType?.ToString() ?? "application/json",
        };
    }
}
