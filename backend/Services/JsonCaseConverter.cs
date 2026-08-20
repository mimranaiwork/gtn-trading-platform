using System.Text.Json;
using System.Text.Json.Nodes;

namespace GtnTrading.Api.Services;

/// <summary>
/// GTN's own APIs mix casing across endpoints — market-data entity fields are
/// ALL_CAPS_SNAKE_CASE (KEY, TICKER_ID, SOURCE_ID...), while trade/order responses are
/// mostly already lowercase. Endpoints that forward GTN's response body verbatim
/// (MarketDataController, OrdersController, AuthController, GtnProxyController) run it
/// through this first so every endpoint in this API presents camelCase consistently,
/// matching the endpoints that already build their own typed objects (GetQuotes,
/// /ws/quotes, which get camelCase for free from ASP.NET Core's default serializer).
/// </summary>
public static class JsonCaseConverter
{
    public static string ToCamelCase(string json)
    {
        JsonNode? node;
        try
        {
            node = JsonNode.Parse(json);
        }
        catch (JsonException)
        {
            return json; // not JSON (empty body, plain-text error, etc.) — pass through unchanged
        }

        Convert(node);
        return node?.ToJsonString() ?? json;
    }

    private static void Convert(JsonNode? node)
    {
        switch (node)
        {
            case JsonObject obj:
                foreach (var key in obj.Select(kv => kv.Key).ToList())
                {
                    var value = obj[key];
                    obj.Remove(key);
                    Convert(value);
                    obj[ToCamelKey(key)] = value;
                }
                break;
            case JsonArray arr:
                foreach (var item in arr) Convert(item);
                break;
        }
    }

    private static string ToCamelKey(string key)
    {
        var parts = key.Split('_', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 0) return key;

        if (parts.Length == 1)
        {
            var word = parts[0];
            return word.Length > 1 && word.All(char.IsUpper)
                ? word.ToLowerInvariant()
                : char.ToLowerInvariant(word[0]) + word[1..];
        }

        var result = new System.Text.StringBuilder();
        for (var i = 0; i < parts.Length; i++)
        {
            var word = parts[i];
            var normalized = word.All(char.IsUpper) ? word.ToLowerInvariant() : word;
            result.Append(i == 0
                ? char.ToLowerInvariant(normalized[0]) + normalized[1..]
                : char.ToUpperInvariant(normalized[0]) + normalized[1..]);
        }
        return result.ToString();
    }
}
