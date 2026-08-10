# GTN trade-event WebSocket — protocol reference

This is **not documented anywhere in the Postman collection or the public docs** (the
collection only lists a `GET /trade/stream/v1.2.1` SSE endpoint, which returns `400`
with no documented required params in the sandbox). This protocol was reverse-engineered
by connecting directly to the URL from the sandbox config PDF
(`wss://sandbox.globaltradingnetwork.com/trade/websocket`) and probing it. Everything
below is a real captured exchange, not a guess.

The backend proxies this at `ws://<backend>/ws/trade` (implemented in `Program.cs`)
so the browser never sees the GTN access token — connect the frontend to that, not
directly to GTN.

## 1. Connect

```
wss://sandbox.globaltradingnetwork.com/trade/websocket
```

The handshake itself accepts any connection, authenticated or not — no `Authorization`
header, query-param token, or Sec-WebSocket subprotocol is required or checked at
handshake time. (Tried: no auth, `Authorization: Bearer <token>` header, `?token=`,
`?access_token=` — all get a plain `101 Switching Protocols` with no immediate message.)

## 2. Authenticate — first text frame

Send, as the **first text frame** after connecting:

**Request:**
```json
{"token": "<GTN access token, same one returned by POST /trade/auth/token>"}
```

**Response (plain text, not JSON):**
```
AUTHENTICATION SUCCESS
```

Only the presence of a `token` key matters — extra keys in the same frame (e.g.
`action`, `channel`) are silently ignored for auth purposes. Omitting `token` and
sending any other message first gets:

```
authenticate first
```

## 3. Subscribing (channel filter — unresolved)

After authenticating, order/trade events for the *entire institution* are pushed
automatically — **no subscribe message is required or was found to do anything useful**.
Several subscribe-shaped messages were tried and every one got the same generic reply:

**Request (any of these):**
```json
{"action": "subscribe", "channel": "ORDER_EVENT"}
{"action": "subscribe", "topic": "orders"}
{"subscribe": "orders"}
{"action": "subscribe", "channel": "orders"}
```

**Response (plain text, not JSON):**
```
check message
```

So the real subscribe/channel-filter syntax (if one exists, e.g. to scope events to one
account or symbol) is still unknown — `check message` reads like a generic
malformed-payload error rather than a real ack, but nothing tried produced a different
response. If you need filtered events, this needs the real docs (behind the
developer.gtngroup.com login) or a support ticket to GTN. Until then, treat the feed as
an unfiltered firehose and filter client-side.

## 4. Live event push

Confirmed by placing a real order (`POST /trade/fo/v1.2.1/order/create`) while
connected and authenticated — the event arrived over the socket in well under a second,
unprompted:

**Trigger (for context, not sent over the WS):**
```json
POST /trade/fo/v1.2.1/order/create
{
  "externalOrderId": "wstest-1786021960",
  "accountNumber": "P001799341",
  "symbol": "AAPL",
  "exchange": "NSDQ",
  "quantity": 1,
  "orderType": "1",
  "orderSide": 1,
  "tif": 0,
  "tradingSession": "REG",
  "orderValue": 0,
  "securityType": "CS"
}
```

**Push received on the WebSocket (plain JSON text frame, unprompted):**
```json
{
  "orderNumber": "26Q061001315",
  "orderId": "26Q061001315",
  "orderType": "1",
  "price": 0.0,
  "averagePrice": 0.0,
  "orderQty": 1.0,
  "filledQty": 0.0,
  "orderValue": 313.95,
  "netOrderValue": 322.0895,
  "filledOrderValue": 0.0,
  "createdDate": "2026/08/06-13:40:20",
  "tif": "0",
  "executionId": "",
  "orderStatus": "8",
  "expiryDate": "20260806235959",
  "exchange": "NSDQ",
  "symbol": "AAPL",
  "accountNumber": "P001799341",
  "rejectReason": "Not Enough buying power in the Cash Account. Buying Power=0.0 Net Settle=322.0895",
  "orderSide": "1",
  "commission": 8.1395,
  "institutionCode": "JAZIRAPOC",
  "customerNumber": "987778399",
  "securityType": "CS"
}
```

Note `orderStatus: "8"` here is a rejection (see `rejectReason` — the sandbox account
has $0 buying power), not a fill. The event shape itself — order identifiers, qty/price
fields, status, reject reason, institution/customer/account context — is what you get
regardless of outcome; a filled or partially-filled order would carry the same fields
with `filledQty`/`averagePrice`/`filledOrderValue` populated and a different
`orderStatus`. The exact status code enum wasn't documented anywhere available in this
session — infer meanings empirically (this session only observed `"8"`) or get the
enum from GTN.

## Summary: message types seen on this socket

| Direction | Payload | Meaning |
|---|---|---|
| → send | `{"token": "<access token>"}` | authenticate |
| ← recv | `AUTHENTICATION SUCCESS` (plain text) | auth accepted |
| ← recv | `authenticate first` (plain text) | sent something before authenticating |
| → send | `{"action": "subscribe", ...}` (any shape tried) | attempt to scope the feed |
| ← recv | `check message` (plain text) | reply to every subscribe attempt tried — meaning unresolved |
| ← recv | JSON object (order event, see §4) | unprompted push, no subscribe needed |

Two response types are plain text (`AUTHENTICATION SUCCESS`, `check message`,
`authenticate first`) rather than JSON — don't assume every frame is `JSON.parse`-able;
the frontend's `useTradeStream` hook currently displays raw frame text for exactly this
reason rather than parsing every message as JSON.
