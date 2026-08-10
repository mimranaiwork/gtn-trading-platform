using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace GtnTrading.Api.Services;

public record GtnTokenResponse(
    string Status,
    string Reason,
    int RejectCode,
    string? AccessToken,
    string? RefreshToken,
    long AccessTokenExpiresAt,
    long RefreshTokenExpiresAt,
    string? TokenType);

public class GtnAuthService
{
    private readonly HttpClient _http;
    private readonly GtnOptions _options;
    private readonly ILogger<GtnAuthService> _logger;
    private readonly SemaphoreSlim _lock = new(1, 1);

    private string? _accessToken;
    private string? _refreshToken;
    private DateTimeOffset _accessTokenExpiresAt = DateTimeOffset.MinValue;

    public GtnAuthService(HttpClient http, IOptions<GtnOptions> options, ILogger<GtnAuthService> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<string> GetAccessTokenAsync(CancellationToken ct = default)
    {
        if (_accessToken is not null && DateTimeOffset.UtcNow < _accessTokenExpiresAt - TimeSpan.FromSeconds(30))
            return _accessToken;

        await _lock.WaitAsync(ct);
        try
        {
            if (_accessToken is not null && DateTimeOffset.UtcNow < _accessTokenExpiresAt - TimeSpan.FromSeconds(30))
                return _accessToken;

            if (_refreshToken is not null)
            {
                try
                {
                    await RefreshAsync(ct);
                    return _accessToken!;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Token refresh failed, falling back to full re-authentication");
                }
            }

            await AuthenticateAsync(ct);
            return _accessToken!;
        }
        finally
        {
            _lock.Release();
        }
    }

    private async Task AuthenticateAsync(CancellationToken ct)
    {
        var assertion = BuildAssertion();

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{_options.TradeBaseUrl.TrimEnd('/')}/auth/token")
        {
            Content = JsonContent.Create(new { assertion })
        };
        request.Headers.Add("Throttle-Key", _options.AppKey);
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Basic",
            Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_options.AppKey}:{_options.AppSecret}")));

        var response = await _http.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"GTN auth failed ({(int)response.StatusCode}): {body}");

        var token = JsonSerializer.Deserialize<GtnTokenResponse>(body, JsonOpts)
            ?? throw new InvalidOperationException("GTN auth returned an empty response");

        if (token.Status != "SUCCESS" || token.AccessToken is null)
            throw new InvalidOperationException($"GTN auth rejected: {token.Reason} (code {token.RejectCode})");

        ApplyToken(token);
    }

    private async Task RefreshAsync(CancellationToken ct)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{_options.TradeBaseUrl.TrimEnd('/')}/auth/token/refresh")
        {
            Content = JsonContent.Create(new { refreshToken = _refreshToken })
        };
        request.Headers.Add("Throttle-Key", _options.AppKey);
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Basic",
            Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_options.AppKey}:{_options.AppSecret}")));

        var response = await _http.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"GTN token refresh failed ({(int)response.StatusCode}): {body}");

        var token = JsonSerializer.Deserialize<GtnTokenResponse>(body, JsonOpts)
            ?? throw new InvalidOperationException("GTN refresh returned an empty response");

        if (token.Status != "SUCCESS" || token.AccessToken is null)
            throw new InvalidOperationException($"GTN refresh rejected: {token.Reason} (code {token.RejectCode})");

        ApplyToken(token);
    }

    private void ApplyToken(GtnTokenResponse token)
    {
        _accessToken = token.AccessToken;
        _refreshToken = token.RefreshToken;
        _accessTokenExpiresAt = DateTimeOffset.FromUnixTimeMilliseconds(token.AccessTokenExpiresAt);
    }

    private string BuildAssertion()
    {
        var privateKeyBytes = Convert.FromHexString(_options.PrivateKeyHex);
        using var rsa = RSA.Create();
        rsa.ImportPkcs8PrivateKey(privateKeyBytes, out _);

        var signingCredentials = new SigningCredentials(new RsaSecurityKey(rsa), SecurityAlgorithms.RsaSha256)
        {
            CryptoProviderFactory = new CryptoProviderFactory { CacheSignatureProviders = false }
        };

        var now = DateTime.UtcNow;
        var jwt = new JwtSecurityToken(
            issuer: _options.AppKey,
            claims: new[]
            {
                new Claim("instCode", _options.InstitutionCode),
                new Claim("userId", _options.UserId)
            },
            notBefore: now,
            expires: now.AddMinutes(5),
            signingCredentials: signingCredentials);

        return new JwtSecurityTokenHandler().WriteToken(jwt);
    }

    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);
}
