using GtnTrading.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace GtnTrading.Api.Controllers;

/// <summary>
/// Account portfolio/valuation — dedicated, discoverable endpoints for GTN's
/// fo/v1.2.1/customer/account/* group (also reachable raw via GtnProxyController,
/// but these give named routes with documented query params instead of requiring
/// callers to know GTN's own paths). Responses run through JsonCaseConverter like
/// every other pass-through endpoint, so they're camelCase regardless of what GTN
/// itself returns for a given field.
/// </summary>
[ApiController]
[Route("api/portfolio")]
public class PortfolioController : ControllerBase
{
    private readonly GtnApiClient _gtn;

    public PortfolioController(GtnApiClient gtn)
    {
        _gtn = gtn;
    }

    /// <summary>
    /// Get Valuation for Security Account. GTN rejects the institution-level server
    /// token for this endpoint ("This API only supports for customer token"), so it
    /// requires the customer session token from POST /api/auth/login, passed as
    /// Authorization: Bearer &lt;accessToken&gt;.
    /// </summary>
    [HttpGet("security-valuation")]
    public async Task<IActionResult> SecurityValuation(
        [FromQuery] string? accountNumber, [FromQuery] string? toCurrency, CancellationToken ct)
    {
        if (!TryGetCustomerToken(out var token, out var error)) return error!;
        var res = await _gtn.TradeRequestWithTokenAsync(
            HttpMethod.Get, $"fo/v1.2.1/customer/account/security/valuation{Request.QueryString}", token, ct);
        return await Forward(res);
    }

    /// <summary>Get Valuation For Cash Account. Requires a customer token — see SecurityValuation.</summary>
    [HttpGet("cash-valuation")]
    public async Task<IActionResult> CashValuation(
        [FromQuery] string? cashAccountNumber, [FromQuery] string? toCurrency, CancellationToken ct)
    {
        if (!TryGetCustomerToken(out var token, out var error)) return error!;
        var res = await _gtn.TradeRequestWithTokenAsync(
            HttpMethod.Get, $"fo/v1.2.1/customer/account/cash/valuation{Request.QueryString}", token, ct);
        return await Forward(res);
    }

    /// <summary>Get Valuation For Customer Account. Requires a customer token — see SecurityValuation.</summary>
    [HttpGet("valuation")]
    public async Task<IActionResult> CustomerValuation(
        [FromQuery] string? customerNumber, [FromQuery] string? referenceNumber, [FromQuery] string? toCurrency, CancellationToken ct)
    {
        if (!TryGetCustomerToken(out var token, out var error)) return error!;
        var res = await _gtn.TradeRequestWithTokenAsync(
            HttpMethod.Get, $"fo/v1.2.1/customer/account/valuation{Request.QueryString}", token, ct);
        return await Forward(res);
    }

    /// <summary>Get Account Summary (cash accounts).</summary>
    [HttpGet("cash-summary")]
    public async Task<IActionResult> CashSummary(
        [FromQuery] string? accountNumber, [FromQuery] string? cashAccountNumber, [FromQuery] string? customerNumber,
        [FromQuery] int? pageNo, [FromQuery] int? pageWidth, CancellationToken ct)
    {
        var res = await _gtn.TradeRequestAsync(
            HttpMethod.Get, $"fo/v1.2.1/customer/account/cash/summary{Request.QueryString}", ct: ct);
        return await Forward(res);
    }

    /// <summary>Get Positions (security holdings summary).</summary>
    [HttpGet("positions")]
    public async Task<IActionResult> Positions(
        [FromQuery] string? accountNumber, [FromQuery] string? customerNumber, [FromQuery] string? exchange,
        [FromQuery] int? pageNo, [FromQuery] int? pageWidth, CancellationToken ct)
    {
        var res = await _gtn.TradeRequestAsync(
            HttpMethod.Get, $"fo/v1.2.1/customer/account/security/summary{Request.QueryString}", ct: ct);
        return await Forward(res);
    }

    private bool TryGetCustomerToken(out string token, out IActionResult? error)
    {
        var header = Request.Headers.Authorization.ToString();
        if (header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var candidate = header["Bearer ".Length..].Trim();
            if (!string.IsNullOrEmpty(candidate))
            {
                token = candidate;
                error = null;
                return true;
            }
        }

        token = "";
        error = new ObjectResult(new
        {
            error = "This endpoint requires a customer session token. Call POST /api/auth/login first and pass the returned accessToken as 'Authorization: Bearer <token>'."
        })
        { StatusCode = StatusCodes.Status401Unauthorized };
        return false;
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
