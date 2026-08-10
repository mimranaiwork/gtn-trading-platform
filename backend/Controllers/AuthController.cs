using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using GtnTrading.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace GtnTrading.Api.Controllers;

public record LoginRequest(string CustomerNumber);
public record RefreshRequest(string RefreshToken);

/// <summary>
/// Customer-level login. GTN's model isn't username/password against GTN itself —
/// the institution (us, already authenticated server-side via GtnAuthService) vouches
/// for a customer number and exchanges it for a customer-scoped session token via
/// POST /trade/auth/customer/token. There is no password field in that exchange; a
/// real deployment would gate this behind the broker's own customer identity check
/// (app PIN, OTP, whatever) before calling this endpoint — that layer doesn't exist
/// in the sandbox, so this trusts the customerNumber as given.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IHttpClientFactory _factory;
    private readonly GtnAuthService _auth;
    private readonly GtnOptions _options;

    public AuthController(IHttpClientFactory factory, GtnAuthService auth, IOptions<GtnOptions> options)
    {
        _factory = factory;
        _auth = auth;
        _options = options.Value;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req, CancellationToken ct)
    {
        var instToken = await _auth.GetAccessTokenAsync(ct);
        var client = _factory.CreateClient();

        using var request = new HttpRequestMessage(
            HttpMethod.Post, $"{_options.TradeBaseUrl.TrimEnd('/')}/auth/customer/token")
        {
            Content = JsonContent.Create(new { customerNumber = req.CustomerNumber, accessToken = instToken })
        };
        request.Headers.Add("Throttle-Key", _options.AppKey);

        var response = await client.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);
        return new ContentResult { StatusCode = (int)response.StatusCode, Content = body, ContentType = "application/json" };
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest req, CancellationToken ct)
    {
        var client = _factory.CreateClient();
        using var request = new HttpRequestMessage(
            HttpMethod.Post, $"{_options.TradeBaseUrl.TrimEnd('/')}/auth/customer/token/refresh")
        {
            Content = JsonContent.Create(new { refreshToken = req.RefreshToken })
        };
        request.Headers.Add("Throttle-Key", _options.AppKey);

        var response = await client.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);
        return new ContentResult { StatusCode = (int)response.StatusCode, Content = body, ContentType = "application/json" };
    }
}
