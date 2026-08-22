using GtnTrading.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace GtnTrading.Api.Controllers;

public record PlaceOrderRequest(
    string ExternalOrderId,
    string AccountNumber,
    string Symbol,
    string Exchange,
    decimal Quantity,
    string OrderType,
    int OrderSide,
    decimal? Price,
    int Tif,
    string TradingSession,
    decimal OrderValue,
    string SecurityType);

public record AmendOrderRequest(
    string OrderId, string OrderReferenceId, decimal Amount, decimal? Quantity, decimal? Price, int? Tif, string? OrderType);

public record CancelOrderRequest(string OrderId, string OrderReferenceId);

public record ExerciseOptionRequest(
    string AccountNumber, string Symbol, string Exchange, string BaseExchange,
    decimal ExerciseQuantity, string HoldingType);

[ApiController]
[Route("api/orders")]
public class OrdersController : ControllerBase
{
    private readonly GtnApiClient _gtn;

    public OrdersController(GtnApiClient gtn)
    {
        _gtn = gtn;
    }

    [HttpPost]
    public async Task<IActionResult> Place([FromBody] PlaceOrderRequest order, CancellationToken ct)
    {
        var res = await _gtn.TradeRequestAsync(HttpMethod.Post, "fo/v1.2.1/order/create", order, ct);
        return await Forward(res);
    }

    [HttpPost("amend")]
    public async Task<IActionResult> Amend([FromBody] AmendOrderRequest order, CancellationToken ct)
    {
        var res = await _gtn.TradeRequestAsync(HttpMethod.Post, "fo/v1.2.1/order/amend", order, ct);
        return await Forward(res);
    }

    [HttpPost("cancel")]
    public async Task<IActionResult> Cancel([FromBody] CancelOrderRequest order, CancellationToken ct)
    {
        var res = await _gtn.TradeRequestAsync(HttpMethod.Post, "fo/v1.2.1/order/cancel", order, ct);
        return await Forward(res);
    }

    [HttpGet("{orderId}")]
    public async Task<IActionResult> Get(string orderId, CancellationToken ct)
    {
        var res = await _gtn.TradeRequestAsync(HttpMethod.Get, $"fo/v1.2.1/order?orderId={Uri.EscapeDataString(orderId)}", ct: ct);
        return await Forward(res);
    }

    /// <summary>
    /// Looks up an order's real GTN orderId from the orderReferenceId returned by
    /// POST /api/orders (that's all placeOrder gives you). Amend/cancel need the real
    /// orderId, not the reference — this closes that gap so the UI can auto-populate
    /// both fields instead of asking the user to hunt down IDs manually.
    /// </summary>
    [HttpGet("lookup")]
    public async Task<IActionResult> Lookup(
        [FromQuery] string orderReferenceId, [FromQuery] string securityType = "CS", CancellationToken ct = default)
    {
        var res = await _gtn.TradeRequestAsync(
            HttpMethod.Get,
            $"fo/v1.2.1/order?orderReferenceId={Uri.EscapeDataString(orderReferenceId)}&securityType={Uri.EscapeDataString(securityType)}",
            ct: ct);
        return await Forward(res);
    }

    /// <summary>Params below exist purely so Swagger renders input fields — the actual
    /// forward uses the raw query string, so any param GTN documents works even if not
    /// listed here explicitly.</summary>
    [HttpGet("search")]
    public async Task<IActionResult> Search(
        [FromQuery] string? customerNumber, [FromQuery] string? cashAccountNumber, [FromQuery] string? accountNumber,
        [FromQuery] string? exchange, [FromQuery] string? symbol, [FromQuery] string? orderId,
        [FromQuery] string? orderStatus, [FromQuery] int? orderSide, [FromQuery] string? sTime, [FromQuery] string? eTime,
        CancellationToken ct)
    {
        var query = Request.QueryString.Value ?? "";
        var res = await _gtn.TradeRequestAsync(HttpMethod.Get, $"fo/v1.2.1/orders/search{query}", ct: ct);
        return await Forward(res);
    }

    [HttpGet("open")]
    public async Task<IActionResult> Open(
        [FromQuery] string? customerNumber, [FromQuery] string? cashAccountNumber, [FromQuery] string? accountNumber,
        [FromQuery] string? symbol, [FromQuery] string? exchange, [FromQuery] int? orderSide, [FromQuery] string? orderId,
        [FromQuery] string? sDate, [FromQuery] string? eDate, [FromQuery] int? pageNo, [FromQuery] int? pageWidth,
        [FromQuery] string securityType = "CS", CancellationToken ct = default)
    {
        var query = Request.QueryString.Value ?? "";
        var res = await _gtn.TradeRequestAsync(HttpMethod.Get, $"fo/v1.2.1/orders/open{query}", ct: ct);
        return await Forward(res);
    }

    [HttpPost("exercise-option")]
    public async Task<IActionResult> ExerciseOption([FromBody] ExerciseOptionRequest req, CancellationToken ct)
    {
        var res = await _gtn.TradeRequestAsync(HttpMethod.Post, "fo/v1.2.1/exercise/options", req, ct);
        return await Forward(res);
    }

    [HttpGet("exercise-requests")]
    public async Task<IActionResult> ExerciseRequests(
        [FromQuery] string? referenceId, [FromQuery] string? customerNumber, [FromQuery] string? accountNumber,
        [FromQuery] string? symbol, [FromQuery] string? requestStatus, [FromQuery] string? startDate,
        [FromQuery] string? endDate, [FromQuery] int? pageNo, [FromQuery] int? pageWidth, CancellationToken ct)
    {
        var query = Request.QueryString.Value ?? "";
        var res = await _gtn.TradeRequestAsync(HttpMethod.Get, $"fo/v1.2.1/exercise/options/requests{query}", ct: ct);
        return await Forward(res);
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
