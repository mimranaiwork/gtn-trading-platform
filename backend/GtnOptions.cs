namespace GtnTrading.Api;

public class GtnOptions
{
    public const string SectionName = "Gtn";

    public required string InstitutionCode { get; set; }
    public required string AppKey { get; set; }
    public required string AppSecret { get; set; }
    public required string PrivateKeyHex { get; set; }
    public required string TradeBaseUrl { get; set; }
    public required string MarketDataBaseUrl { get; set; }
    public required string TradeStreamWsUrl { get; set; }
    public required string MarketDataWsUrl { get; set; }
    public string UserId { get; set; } = "server1";
}
