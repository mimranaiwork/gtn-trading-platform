using System.Text.Json;

namespace GtnTrading.Api.Services;

public record Quote(
    string Key, string Symbol, string Exchange,
    double? Last, double? Change, double? PctChange,
    double? Open, double? High, double? Low, double? PrevClose,
    long? Volume, string TransactionDate, string? LastUpdatedOn);

/// <summary>
/// Shared quote-fetching logic used by both the polled REST endpoint
/// (GET /api/marketdata/quotes) and the push-style WebSocket (/ws/quotes) — see
/// MarketDataController.GetQuotes for why history/keys/data is the source (GTN's real
/// realtime/intraday endpoints are 403 for this sandbox institution).
/// </summary>
public static class QuoteFetcher
{
    public static async Task<List<Quote>> FetchAsync(GtnApiClient gtn, string keys, CancellationToken ct)
    {
        var keyList = keys.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (keyList.Length == 0) return [];

        var res = await gtn.MarketDataRequestAsync(
            HttpMethod.Get,
            $"history/keys/data?keys={Uri.EscapeDataString(keys)}&rows={keyList.Length * 5}&sort-field=TRANSACTION_DATE&sort-asc=false",
            ct);
        if (!res.IsSuccessStatusCode) return [];

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

        return latestByKey.Values.Select(d => new Quote(
            Key: d.GetProperty("KEY").GetString()!,
            Symbol: d.GetProperty("TICKER_ID").GetString()!,
            Exchange: d.GetProperty("SOURCE_ID").GetString()!,
            Last: d.TryGetProperty("LASTTRADEPRICE", out var v1) ? v1.GetDouble() : null,
            Change: d.TryGetProperty("CHANGE", out var v2) ? v2.GetDouble() : null,
            PctChange: d.TryGetProperty("PCT_CHANGE", out var v3) ? v3.GetDouble() : null,
            Open: d.TryGetProperty("OPEN", out var v4) ? v4.GetDouble() : null,
            High: d.TryGetProperty("HIGH", out var v5) ? v5.GetDouble() : null,
            Low: d.TryGetProperty("LOW", out var v6) ? v6.GetDouble() : null,
            PrevClose: d.TryGetProperty("PREV_CLOSED", out var v7) ? v7.GetDouble() : null,
            Volume: d.TryGetProperty("VOLUME", out var v8) ? v8.GetInt64() : null,
            TransactionDate: d.GetProperty("TRANSACTION_DATE").GetString()!,
            LastUpdatedOn: d.TryGetProperty("LAST_UPDATED_ON", out var v9) ? v9.GetString() : null
        )).ToList(); // materialize before `doc` is disposed
    }
}
