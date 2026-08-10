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
        var keyList = keys.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        // History has one row per key per trading day; over-fetch and dedupe to the
        // latest row per key rather than trusting row-count math to land exactly right.
        var res = await _gtn.MarketDataRequestAsync(
            HttpMethod.Get,
            $"history/keys/data?keys={Uri.EscapeDataString(keys)}&rows={keyList.Length * 5}&sort-field=TRANSACTION_DATE&sort-asc=false",
            ct);
        if (!res.IsSuccessStatusCode) return await Forward(res);

        var body = await res.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(body);
        var docs = doc.RootElement.GetProperty("response").GetProperty("docs");

        var latestByKey = new Dictionary<string, JsonElement>();
        foreach (var d in docs.EnumerateArray())
        {
            var key = d.GetProperty("KEY").GetString()!;
            if (!latestByKey.ContainsKey(key)) // already sorted newest-first
                latestByKey[key] = d;
        }

        var quotes = latestByKey.Values.Select(d => new
        {
            key = d.GetProperty("KEY").GetString(),
            symbol = d.GetProperty("TICKER_ID").GetString(),
            exchange = d.GetProperty("SOURCE_ID").GetString(),
            last = d.TryGetProperty("LASTTRADEPRICE", out var v1) ? v1.GetDouble() : (double?)null,
            change = d.TryGetProperty("CHANGE", out var v2) ? v2.GetDouble() : (double?)null,
            pctChange = d.TryGetProperty("PCT_CHANGE", out var v3) ? v3.GetDouble() : (double?)null,
            open = d.TryGetProperty("OPEN", out var v4) ? v4.GetDouble() : (double?)null,
            high = d.TryGetProperty("HIGH", out var v5) ? v5.GetDouble() : (double?)null,
            low = d.TryGetProperty("LOW", out var v6) ? v6.GetDouble() : (double?)null,
            prevClose = d.TryGetProperty("PREV_CLOSED", out var v7) ? v7.GetDouble() : (double?)null,
            volume = d.TryGetProperty("VOLUME", out var v8) ? v8.GetInt64() : (long?)null,
            transactionDate = d.GetProperty("TRANSACTION_DATE").GetString(),
            lastUpdatedOn = d.TryGetProperty("LAST_UPDATED_ON", out var v9) ? v9.GetString() : null,
        }).ToList(); // materialize before `doc` is disposed — response serialization happens after this method returns

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
            Content = body,
            ContentType = "application/json"
        };
    }
}
