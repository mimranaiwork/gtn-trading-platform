# GTN Trading — JAZIRAPOC Sandbox Starter

A working React + .NET starter wired to the real GTN (Global Trading Network) sandbox
for institution `JAZIRAPOC` (Al Jazira Capital). Auth, market data lookup, and order
placement have been verified end-to-end against the live sandbox.

## Structure

```
backend/    .NET 8 Web API — owns the GTN credentials, never exposes them to the browser
frontend/   React + Vite + TS + Zustand + React Query + Tailwind
```

## How auth works

GTN's `/trade/auth/token` expects:
- Header `Throttle-Key: <App Key>`
- Header `Authorization: Basic base64(appKey:appSecret)`
- Body `{"assertion": "<RS256 JWT>"}` where the JWT is signed with the institution's
  RSA private key and carries claims `iss=<App Key>`, `instCode=<Institution Code>`,
  `userId=<any stable server id>`.

This is implemented in [`backend/Services/GtnAuthService.cs`](backend/Services/GtnAuthService.cs),
which fetches, caches, and auto-refreshes the access token. All other backend calls go
through [`GtnApiClient`](backend/Services/GtnApiClient.cs), which attaches the bearer
token automatically — the frontend never sees a GTN credential.

**Important:** GTN's sandbox sits behind a WAF that silently drops (rather than
rejects) requests without a browser-like `User-Agent`. This is configured on the
shared `HttpClient` in `Program.cs` — don't remove it.

## Running it

Backend:
```bash
cd backend
dotnet run --urls http://localhost:5288
```

Frontend (`frontend/.env` already points at `http://localhost:5288`):
```bash
cd frontend
npm install
npm run dev
```

Ports 5080/5173/5174 were occupied by other local processes when this was built, so
5288 (backend) / 5183 (frontend) were used instead — change both `frontend/.env`
(`VITE_API_URL`) and `backend/appsettings.Development.json` (`Frontend:Origin`) together
if you need different ports, then restart the backend (CORS origin is read once at
startup).

## What's verified working

- **Auth** (`GtnAuthService`) — confirmed live against sandbox.
- **Market data** (`GET /api/marketdata/tickers?keys=NSDQ~AAPL`) — confirmed live,
  returns real GTN instrument data (rendered in the Watchlist).
- **Order placement** (`POST /api/orders`) — confirmed fully working, order accepted by
  GTN's OMS (`"status": "SUCCESS", "reason": "Order sent to OMS"`), verified both via
  direct API call and by clicking through the actual UI. The account number
  `P001799341` (customer `987778399`, NSDQ-trading-enabled) is a real account already
  provisioned in the JAZIRAPOC sandbox and is used as the OrderForm's default. To find
  other provisioned accounts: `GET /trade/bo/v1.2/customer/accounts` lists customer
  numbers, then `GET /trade/bo/v1.2.1/customer/account?customerNumber=<n>` returns each
  customer's `securityAccounts[].accountNumber` (the value order placement expects) and
  which exchanges are trading-enabled for it.

## Market data: listing, search, quotes, movers, indices

These were built against the sandbox's real entitlements, discovered by testing live
rather than assumed — GTN's dedicated `symbol-search`, `realtime`, `intraday`, and
`top-stocks` endpoints are all `403 Forbidden` for the JAZIRAPOC institution, and the
market-data WebSocket throws a server-side `NullPointerException` on auth (same
`{"token": ...}` frame that works for the trade WebSocket — this looks like a GTN
sandbox bug, not something fixable client-side). What *does* work: instrument reference
data (`tickers-all`) and EOD/latest-tick history (`history`), both of which support a
wildcard `filter` param and server-side `sort-field`/`sort-asc` — that's the real data
behind every feature below, no fabricated numbers anywhere.

- **Listing** (`GET /api/marketdata/listing?exchange=NSDQ&page=1&rows=50`) — paginated
  instrument browse per exchange, backing the Markets panel's default (no-query) view.
- **Search** (`GET /api/marketdata/search?exchange=NSDQ&query=AAP`) — ticker-prefix
  search via `tickers-all`'s wildcard filter (`TICKER_ID:AAP*`), since the dedicated
  search endpoint is forbidden. Confirmed live for prefixes like `AAP`, `NVD`.
- **Quotes** (`GET /api/marketdata/quotes?keys=NSDQ~AAPL,NSDQ~MSFT`) — latest
  price/change/volume per symbol, deduped server-side to one row per key from GTN's
  history data (which is one row per symbol per trading day). This is the closest thing
  to "live" data actually available here — the Watchlist and Indices panels poll it
  every 10s. It's the latest daily snapshot, not a tick-by-tick push feed; see the WS
  section below for why.
- **Movers** (`GET /api/marketdata/movers?exchange=NSDQ&direction=gainers&rows=10`) —
  real top gainers/losers, computed via two live GTN calls: find the most recent
  `TRANSACTION_DATE` for the exchange, then ask GTN to sort that day's rows by
  `PCT_CHANGE` server-side. Confirmed live, e.g. NSDQ gainers topped by `ANSCW +250%`.
- **Indices** — same watchlist mechanism as stocks, in a separate named list
  (`useMarketStore`'s `lists.indices`). Checked `SPX`/`DJI`/`NDX`/`COMP`/`IXIC` against
  both `NSDQ` and `NYSE` — zero matches on any of them, confirming this sandbox
  institution has no index instruments entitled at all (not a bug — genuinely absent).
  The panel is honest about this rather than showing fake numbers; add any real symbol
  via Markets search (target dropdown → "Indices") and it'll work exactly like the
  stock watchlist, including on a real account that does have index entitlement.

## Live trade-event stream

Trade/order events are pushed over a raw WebSocket at `TradeStreamWsUrl`
(`wss://sandbox.globaltradingnetwork.com/trade/websocket`) — **not** the documented
`GET /trade/stream/v1.2.1` SSE endpoint, which returns `400` with no documented params
in the sandbox. The WS handshake itself accepts any connection; auth happens by sending
`{"token": "<accessToken>"}` as the first text frame. The server replies
`AUTHENTICATION SUCCESS`, and from then on order/trade events for the institution are
pushed automatically — no explicit subscribe message is needed (a few subscribe-shaped
messages were tried and all got back `"check message"`, so the exact subscribe/channel
filtering syntax is still unknown, but the default firehose works and was confirmed live
by placing a real order and watching the event arrive over the socket in real time).

This is proxied backend-side (`/ws/trade` in `Program.cs`, using `ClientWebSocket` to
connect out to GTN) so the browser never sees the GTN token, and consumed by
`frontend/src/hooks/useTradeStream.ts` with auto-reconnect.

Full protocol writeup with real captured request/response frames (auth, subscribe
attempts, a live order-event push) is in
[`backend/docs/websocket-events.md`](backend/docs/websocket-events.md).

## The full GTN API surface

`OrdersController` and `MarketDataController` give typed endpoints for the hot paths
the UI already uses (place order, ticker lookup, symbol search). Everything else in
the ~100-endpoint Trade API — onboarding, bank/cash/exchange/security account
management, funding (deposits/withdrawals/transfers), portfolio valuation, statements,
corporate actions, master data, EOD, chart data, news — is reachable through
[`GtnProxyController`](backend/Controllers/GtnProxyController.cs), a generic
authenticated pass-through:

```
{METHOD} /api/gtn/trade/<path>        e.g. GET /api/gtn/trade/bo/v1.2/customer/accounts
{METHOD} /api/gtn/marketdata/<path>   e.g. GET /api/gtn/marketdata/top-stocks/source/data
```

Query params and JSON bodies are forwarded through as-is; auth is injected server-side
the same as everywhere else. This was tested live against three endpoint categories
never hand-wired before (institution exchange list, customer account list, currency
rates) — all worked against the real sandbox on the first try.

The exact method/path/body/query for **every** endpoint in the collection is in
[`backend/docs/gtn-api-reference.md`](backend/docs/gtn-api-reference.md), generated
directly from `postman-collection-v1.2.1.json` (not hand-transcribed, so it can't drift
from the source). Look up what you need there and call it through the proxy path shown
above — no backend code changes required for endpoints the proxy already covers.

18 of those endpoints also carry a **live example** block — a real request/response
pair captured against the JAZIRAPOC sandbox in this session (auth, place order,
customer list/details, exchange list, currency rates, account summaries, settlement
holidays, ticker lookup, and a few real error responses). Everything else in the doc
is only the Postman-authored example body — the collection itself ships **zero** saved
example responses (checked programmatically: 0 of 139 requests), so anything not
marked "live example" is unverified against the real API; treat its shape as informed
guesswork from GTN's docs until you've actually called it.

## Security notes

- Real sandbox credentials (App Key/Secret, RSA private key) live only in
  `backend/appsettings.Development.json`, which is in `.gitignore` — **never commit
  this file**. `backend/appsettings.json` has empty placeholders for other environments.
- This directory isn't a git repo yet. If you `git init` here, double-check
  `git status` before your first commit to confirm the secrets file is actually ignored.
- The generic proxy forwards whatever the caller sends — it doesn't validate business
  rules (e.g. institution code on customer creation). If you expose it beyond local
  dev, add authn/authz in front of it; right now anything that can reach the backend
  can call any GTN endpoint the sandbox credentials are permitted to use.
