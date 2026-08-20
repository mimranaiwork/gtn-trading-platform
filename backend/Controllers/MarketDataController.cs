using System.Text.Json;
using GtnTrading.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace GtnTrading.Api.Controllers;

[ApiController]
[Route("api/marketdata")]
public class MarketDataController : ControllerBase
{
    private readonly GtnApiClient _gtn;

    public MarketDataController(GtnApiClient gtn)
    {
        _gtn = gtn;
    }

    /// <summary>keys = comma-separated "EXCHANGE~SYMBOL" pairs, e.g. NSDQ~AAPL,NSDQ~MSFT</summary>
    [HttpGet("tickers")]
    public async Task<IActionResult> GetTickers([FromQuery] string keys, CancellationToken ct)
    {
        var keyCount = keys.Split(',', StringSplitOptions.RemoveEmptyEntries).Length;
        // GTN defaults to 10 rows/page regardless of how many keys match — each key
        // returns one row per language (5+ in the sandbox), so without an explicit
        // `rows` override, requesting more than ~2 keys silently truncates results.
        var res = await _gtn.MarketDataRequestAsync(
            HttpMethod.Get,
            $"tickers-all/keys/data?keys={Uri.EscapeDataString(keys)}&rows={keyCount * 10}",
            ct);
        return await Forward(res);
    }

    /// <summary>
    /// Paginated instrument listing for one exchange. Backs the "browse an exchange"
    /// list view — real GTN reference data (instrument metadata, not live price).
    /// </summary>
    [HttpGet("listing")]
    public async Task<IActionResult> GetListing(
        [FromQuery] string exchange, [FromQuery] int page = 1, [FromQuery] int rows = 50, CancellationToken ct = default)
    {
        var res = await _gtn.MarketDataRequestAsync(
            HttpMethod.Get,
            $"tickers-all/source/data?source-id={Uri.EscapeDataString(exchange)}&page={page}&rows={rows}",
            ct);
        return await Forward(res);
    }

    /// <summary>
    /// Ticker-prefix search within one exchange. GTN's dedicated symbol-search endpoint
    /// (GET /market-data/symbol-search) is 403 Forbidden for the JAZIRAPOC sandbox
    /// institution — this uses the same wildcard `filter` param the ticker-listing
    /// endpoint supports instead (confirmed working live: `TICKER_ID:{prefix}*`).
    /// </summary>
    [HttpGet("search")]
    public async Task<IActionResult> Search(
        [FromQuery] string exchange, [FromQuery] string query, [FromQuery] int rows = 20, CancellationToken ct = default)
    {
        var filter = Uri.EscapeDataString($"TICKER_ID:{query.ToUpperInvariant()}*");
        var res = await _gtn.MarketDataRequestAsync(
            HttpMethod.Get,
            $"tickers-all/source/data?source-id={Uri.EscapeDataString(exchange)}&filter={filter}&rows={rows}",
            ct);
        return await Forward(res);
    }

    /// <summary>
    /// Latest available quote per key — price, change, volume, bid/ask. GTN's true
    /// realtime/intraday endpoints are 403 Forbidden for this sandbox institution, and
    /// the market-data WebSocket throws a server-side error on auth (see
    /// docs/websocket-events.md), so this is the closest thing to "live" data actually
    /// available: the latest EOD/tick snapshot from the history API, keyed by symbol.
    /// Poll this on an interval for a near-live watchlist rather than a true push feed.
    /// </summary>
    [HttpGet("quotes")]
    public async Task<IActionResult> GetQuotes([FromQuery] string keys, CancellationToken ct)
    {
        var quotes = await QuoteFetcher.FetchAsync(_gtn, keys, ct);
        return Ok(new { quotes });
    }

    /// <summary>
    /// Top gainers/losers for one exchange, computed from real GTN history data (the
    /// dedicated GET /market-data/top-stocks endpoint is 403 Forbidden for this sandbox
    /// institution). Two real calls: first finds the most recent TRANSACTION_DATE for
    /// the exchange, then asks GTN to sort that single day's rows by PCT_CHANGE —
    /// avoids mixing in stale multi-day outliers.
    /// </summary>
    [HttpGet("movers")]
    public async Task<IActionResult> GetMovers(
        [FromQuery] string exchange, [FromQuery] string direction = "gainers", [FromQuery] int rows = 10, CancellationToken ct = default)
    {
        var latestRes = await _gtn.MarketDataRequestAsync(
            HttpMethod.Get,
            $"history/source/data?source-id={Uri.EscapeDataString(exchange)}&rows=1&sort-field=TRANSACTION_DATE&sort-asc=false",
            ct);
        if (!latestRes.IsSuccessStatusCode) return await Forward(latestRes);

        var latestBody = await latestRes.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(latestBody);
        if (!doc.RootElement.TryGetProperty("response", out var response) ||
            !response.TryGetProperty("docs", out var docs) ||
            docs.GetArrayLength() == 0)
        {
            return Ok(new { response = new { numFound = 0, docs = Array.Empty<object>() } });
        }

        var transactionDate = docs[0].GetProperty("TRANSACTION_DATE").GetString()!; // e.g. "2026-08-05T00:00:00Z"
        var day = transactionDate[..10].Replace("-", "");
        var startDate = $"{day}000000";
        var endDate = $"{day}235959";
        var sortAsc = direction == "losers" ? "true" : "false";

        var moversRes = await _gtn.MarketDataRequestAsync(
            HttpMethod.Get,
            $"history/source/data?source-id={Uri.EscapeDataString(exchange)}&start-date={startDate}&end-date={endDate}" +
            $"&sort-field=PCT_CHANGE&sort-asc={sortAsc}&rows={rows}",
            ct);
        return await Forward(moversRes);
    }

    private async Task<IActionResult> Forward(HttpResponseMessage res)
    {
        var body = await res.Content.ReadAsStringAsync();
        return new ContentResult
        {
            StatusCode = (int)res.StatusCode,
            Content = JsonCaseConverter.ToCamelCase(body),
            ContentType = "application/json"
        };
    }
}
