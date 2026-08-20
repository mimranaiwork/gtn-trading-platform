# GTN Trade API reference (generated from postman-collection-v1.2.1.json)
Every request in the Postman collection, generated directly from the collection file (not hand-transcribed) so it stays accurate. Call any of these through the backend's generic proxy:

- Trade API paths (anything starting `bo/`, `fo/`, `auth/`, `stream/`) →
  `{METHOD} /api/gtn/trade/<path>` (backend prepends the real GTN trade base URL)
- Market Data API paths (anything starting `market-data/` — strip that prefix) →
  `{METHOD} /api/gtn/marketdata/<path>`

Query params and JSON bodies are forwarded through unchanged — send exactly what's
shown below. Auth is handled by the backend; do not send a GTN token yourself.

Order placement and ticker/symbol lookups already have dedicated typed endpoints —
see `OrdersController` / `MarketDataController` — prefer those for the UI's hot paths.

**"Live example" blocks are real request/response pairs captured against the actual
JAZIRAPOC sandbox in this session** (not invented) — everywhere else, only the
Postman-authored example body is shown (the collection ships no saved responses at
all — 0 of 139 requests — so anything not marked "live example" is undocumented by
GTN and untested here; treat its shape as a guess until you've called it yourself).
For the live WebSocket protocol (trade event push), see
[`websocket-events.md`](websocket-events.md).

## AUTHENTICATE

> **Handled internally — don't call these through the proxy.** `GtnAuthService`
> already does institution-level auth/refresh automatically for every other proxied
> call. Listed here (with a real captured example) only for reference. "Get Customer
> Token" / "Customer Token Refresh" (customer-level, not institution-level auth) *are*
> wired up — as dedicated endpoints, not through the proxy:
>
> - `POST /api/auth/login` — body `{"customerNumber": "..."}`. The backend fetches its
>   own institution token server-side and injects it, so the caller never needs one.
> - `POST /api/auth/refresh` — body `{"refreshToken": "..."}`, from a prior login's
>   response.
>
> Both return GTN's raw token response (`accessToken`, `refreshToken`,
> `accessTokenExpiresAt`, etc., camelCase). The `accessToken` from login is what
> `PortfolioController`'s valuation endpoints require as `Authorization: Bearer
> <token>` — see [Account Portfolio](#account-portfolio) below.

### Authenticate

**Get Token**  
`POST /api/gtn/trade/auth/token`

Body (Postman-authored example, not verified live):
```json
{
    "assertion": "jwt_token : which signed using shared institution private key"
}
```

> **Live example** (captured against the real JAZIRAPOC sandbox)
>
> Request:
> ```json
> {
>   "assertion": "<RS256 JWT \u2014 see GtnAuthService.BuildAssertion>"
> }
> ```
>
> Response (200):
> ```json
> {"status": "SUCCESS", "reason": "auth token generation success", "rejectCode": 0, "accessToken": "<JWT, ~1hr TTL>", "refreshToken": "<JWT, ~10hr TTL>", "accessTokenExpiresAt": 1786024149770, "refreshTokenExpiresAt": 1786056549768, "tokenType": "bearer"}
> ```
>

**Token Refresh**  
`POST /api/gtn/trade/auth/token/refresh`

Body (Postman-authored example, not verified live):
```json
{
    "refreshToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYnJva2VyIiwicHJvdmlkZXIiOiJvbXMiLCJpc3MiOiJHVE4iLCJpbnN0Q29kZSI6IlRSQURFX0FQSV9JTlNUX09ORSIsImV4cCI6MTcwMzk1NTU5NSwidXNlcklkIjoiMTExMTEiLCJpYXQiOjE3MDM4ODM1OTUsImp0aSI6ImYzODZlMTAwLTA1NTgtNDYwZC04MTUyLTMxZGFkZGVmNTI0YSJ9.E9b1ig-TGfKAd8oLd33PNJ9weBAxkYmyTOW5H9KVins"
}
```

**Get Customer Token**  
`POST /api/gtn/trade/auth/customer/token`

Body (Postman-authored example, not verified live):
```json
{
    "customerNumber": "ASI685695865",
    "accessToken": "O0AeyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYnJva2VyIiwibmJmIjoxNjYwMDQzNjM3LCJwcm92aWRlciI6Im9tcyIsImlzcyI6IjEyMzQtNTY3OC05MTAxIiwiaW5zdENvZGUiOiJUUkFERV9BUElfSU5TVF9PTkUiLCJleHAiOjE2NjAwNzk2MzcsInVzZXJJZCI6IjExMTExIiwiaWF0IjoxNjYwMDQzNjM3fQ.-CWgbkoK6jKceo8DUlNPuQJBrlgRLuwsrR56D87D1Ho"
}
```

**Customer Token Refresh**  
`POST /api/gtn/trade/auth/customer/token/refresh`

Body (Postman-authored example, not verified live):
```json
{
    "refreshToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiY3VzdG9tZXIiLCJwcm92aWRlciI6Im9tcyIsImlzcyI6IjEyMzQtNTY3OC05MTAxIiwiaW5zdENvZGUiOiJUUkFERV9BUElfSU5TVF9PTkUiLCJjdXN0b21lck51bWJlciI6IkFTSTE3MzQ1NTg5NyIsImV4cCI6MTY2MDExNjI3OSwiaWF0IjoxNjYwMDQ0Mjc5LCJqdGkiOiJmNzRiNjNhMy04MzEzLTQyMTUtYmJiOC00N2FlMzM3OGQ0ZjQifQ.SfNpmkzVwOf0Gm4hi_xHKhu2qaCTYcGQph_8sonl5RA"
}
```

## ONBOARD

### Customer Creation

**Create Customer**  
`POST /api/gtn/trade/bo/v1.2/customer/account`

Body (Postman-authored example, not verified live):
```json
{
    "referenceNumber": "84dwedwe",
    "institutionCode": "TRADE_API_INST_ONE"
}
```

**Update Customer**  
`PATCH /api/gtn/trade/bo/v1.2/customer/account`

Body (Postman-authored example, not verified live):
```json
{
    "customerNumber": "ASI173455897",
    "firstName": "Test",
    "lastName": "user",
    "passportNumber": "12312234",
    "nin": "23423234",
    "drivingLicense": "234",
    "homeTel": "+2343456789",
    "officeTel": "+2343456789",
    "mobile": "+2343456789",
    "email": "h@gmail.com",
    "profession": "Mr",
    "address1": "add1",
    "address2": "add2",
    "city": "city",
    "countryCode": "US",
    "gender": "M",
    "birthDate": "2022/05/08",
    "nationality": "US"
}
```

**Get Customer Details**  
`GET /api/gtn/trade/bo/v1.2.1/customer/account`

Query params:
- `customerNumber` — Customer number of the customer account which wants to get the details.
- `referenceNumber` — Reference number of the customer account which wants to get the details.

> **Live example** (captured against the real JAZIRAPOC sandbox)
>
> Response (200):
> ```json
> {"status": "SUCCESS", "reason": "get account details success", "customerNumber": "987778399", "firstName": "Test", "lastName": "user", "referenceNumber": "84dwedwe13", "cashAccounts": [{"cashAccountNumber": "C004691771", "currency": "USD", "balance": 0.0, "securityAccounts": [{"accountNumber": "P001799341", "accountName": "P001228324-USD", "status": "2", "exchangeAccounts": [{"exchange": "AMEX", "exchangeAccountId": 5055388, "tradingEnabled": 1}, {"exchange": "NSDQ", "exchangeAccountId": 5055389, "tradingEnabled": 1}, {"exchange": "NYSE", "exchangeAccountId": 5055390, "tradingEnabled": 1}]}]}]}
> ```
>

**Update Account Setup**  
`PATCH /api/gtn/trade/bo/v1.2.1/customer/account/profile`

Body (Postman-authored example, not verified live):
```json
{
    "customerNumber": "95859632",
    "profileId": 202118
}
```

## TRADE

### Fees and Commissions

**Estimate Order Charges**  
`POST /api/gtn/trade/fo/v1.2.1/order/charges`

Body (Postman-authored example, not verified live):
```json
{
    "accountNumber": "P000128310",
    "quantity": 10,
    "price": 5,
    "exchange": "NSDQ",
    "symbol": "AAPL",
    "tradingSession": "REG",
    "securityType": "CS",
    "orderSide": 1
}
```

**Inspect Customer Commission Groups**  
`GET /api/gtn/trade/bo/v1.2.1/customer/account/exchange/commission-group`

Query params:
- `customerNumber`
- `startDate`
- `endDate`
- `requestId`
- `requestStatus`
- `pageNo`
- `pageWidth`

** Update Customer Commission Group**  
`PATCH /api/gtn/trade/bo/v1.2.1/customer/account/exchange/commission-group`

Body (Postman-authored example, not verified live):
```json
{
    "commissionGroupId": 5265,
    "commissionType": 2,
    "exchangeAccountId": 2314338
}
```

### Trade Management

**Place Order**  
`POST /api/gtn/trade/fo/v1.2.1/order/create`

Body (Postman-authored example, not verified live):
```json
{
    "externalOrderId": "ext-ord-001",
    "accountNumber": "P000128310",
    "symbol": "AAPL",
    "exchange": "NSDQ",
    "quantity": 100,
    "orderType": "2",
    "orderSide": 1,
    "price": 2,
    "tif": 0,
    "tradingSession": "REG",
    "orderValue": 1,
    "securityType": "CS"
}
```

> **Live example** (captured against the real JAZIRAPOC sandbox)
>
> Request:
> ```json
> {
>   "externalOrderId": "ui-1786021234567",
>   "accountNumber": "P001799341",
>   "symbol": "AAPL",
>   "exchange": "NSDQ",
>   "quantity": 1,
>   "orderType": "1",
>   "orderSide": 1,
>   "tif": 0,
>   "tradingSession": "REG",
>   "orderValue": 0,
>   "securityType": "CS"
> }
> ```
>
> Response (200):
> ```json
> {"status": "SUCCESS", "reason": "Order sent to OMS", "orderReferenceId": "E7812027298a4"}
> ```
>

**Amend Order**  
`POST /api/gtn/trade/fo/v1.2.1/order/amend`

Body (Postman-authored example, not verified live):
```json
{
    "orderId": "XXXXXX",
    "orderReferenceId": "XXXXXXX",
    "amount": 6000,
    "price": 20,
    "tif": 0,
    "quantity": 3,
    "orderType": "2"
}
```

**Cancel Order**  
`POST /api/gtn/trade/fo/v1.2.1/order/cancel`

Body (Postman-authored example, not verified live):
```json
{
    "orderId": "XXXXXX",
    "orderReferenceId": "YYYYYYY"
}
```

**Get Order Details**  
`GET /api/gtn/trade/fo/v1.2.1/order`

Query params:
- `orderId`
- `orderReferenceId`
- `externalOrderId` — currently only available for equity asset type orders
- `securityType` — CS(Equity/Spot), OPT(Option), BND(Fixed Income), FND(Mutual Fund)
- `multiLegOrderId` — used only for multi leg option strategy types

**Order Search**  
`GET /api/gtn/trade/fo/v1.2.1/orders/search`

Query params:
- `customerNumber`
- `cashAccountNumber` — cash account number
- `accountNumber` — Security account number
- `exchange`
- `symbol`
- `orderId`
- `orderStatus` — Find list of status [here](/docs/1.2.1/error_handling)
- `orderSide`
- `sTime`
- `eTime`
- `pageNo`
- `pageWidth`
- `securityType` — CS(Equity/Spot), OPT(Option), BND(Fixed Income), FND(Mutual Fund)
- `timeFilter`
- `investmentId`

> **Live example** (captured against the real JAZIRAPOC sandbox)
>
> Response (400):
> ```json
> {
>   "status": "FAILED",
>   "reason": "All required parameters cannot be null or empty",
>   "rejectCode": 1001
> }
> ```
>

**Get Open Orders**  
`GET /api/gtn/trade/fo/v1.2.1/orders/open`

Query params:
- `customerNumber`
- `cashAccountNumber` — cash account number
- `accountNumber` — Security account number
- `symbol`
- `exchange`
- `orderSide`
- `orderId`
- `sDate` — start date
- `eDate` — end date
- `pageNo`
- `pageWidth`
- `securityType` — CS(Equity/Spot), OPT(Option), BND(Fixed Income), FND(Mutual Fund)
- `investmentId`

> **Live example** (captured against the real JAZIRAPOC sandbox)
>
> Response (200):
> ```json
> {
>   "status": "SUCCESS",
>   "reason": "getting open order list success",
>   "rejectCode": 1012,
>   "isNextPageAvailable": false,
>   "pageNo": 1,
>   "pageWidth": 100,
>   "totalNoOfRecords": 0,
>   "list": []
> }
> ```
>

**Request Option Exercise**  
`POST /api/gtn/trade/fo/v1.2.1/exercise/options`

Body (Postman-authored example, not verified live):
```json
{
    "accountNumber": "P001028594",
    "symbol": "AAPL\\25A03\\242.5",
    "exchange": "OPRA",
    "baseExchange": "NSDQ",
    "exerciseQuantity": 1,
    "holdingType": "LONG"
}
```

**List Option Exercise Requests**  
`GET /api/gtn/trade/fo/v1.2.1/exercise/options/requests`

Query params:
- `referenceId` — If referenceId is given as a request parameter, other filters will not be applied
- `customerNumber`
- `accountNumber` — security account number
- `symbol`
- `requestStatus` — N/A (N/A) | VALIDATION_FAILED (validation failed) | CUSTODIAN_NOTIFIED (custodian notified) | ACCEPTED (accepted) | REJECTED (rejected) | EXERCISED (exercised) | PENDING (pending)
- `startDate`
- `endDate`
- `pageNo`
- `pageWidth`

### Events

**Connect to SSE**  
`GET /api/gtn/trade/stream/v1.2.1`

Query params:
- `events` — * events wanted to subscribe
- `snapshot` — Whether a snapshot of the lost data for a down period is required
- `sTime` — * The time period for the requested snapshot

**Manage SSE**  
`POST /api/gtn/trade/stream/v1.2.1`

Body (Postman-authored example, not verified live):
```json
{
    "type": "SUBSCRIBE",
    "events": [
        "ORDER",
        "ENTITLEMENT"
    ]
}
```

## MANAGE

### Customer Account Management

#### Bank Account

**Get Customer Bank Acc**  
`GET /api/gtn/trade/bo/v1.2.1/customer/account/bank`

Query params:
- `bankAccountId`

**Create Customer Bank Acc**  
`POST /api/gtn/trade/bo/v1.2/customer/account/bank`

Body (Postman-authored example, not verified live):
```json
{
    "customerNumber": "ASI950933196",
    "bankId": 121,
    "bankAccountNumber": "XXXXXXXX",
    "accountType": 0,
    "currency": "USD",
    "ibanNumber": "211",
    "branchId": 117
}
```

**Delete Customer Bank Acc**  
`DELETE /api/gtn/trade/bo/v1.2/customer/account/bank`

Query params:
- `bankAccountId`

**Update Customer Bank Acc**  
`PATCH /api/gtn/trade/bo/v1.2/customer/account/bank`

Body (Postman-authored example, not verified live):
```json
{
    "customerNumber": "ASI173455897",
    "bankId": 121,
    "bankAccountNumber": "1233",
    "accountType": 0,
    "currency": "USD",
    "ibanNumber": "211",
    "bankAccountId": 9371,
    "branchId": "242"
}
```

**Get Customer Bank Accounts**  
`GET /api/gtn/trade/bo/v1.2/customer/account/banks`

Query params:
- `customerNumber` — If customer token is used to send the api request, customer number used to create that token will be considered.

#### Cash Account

**Create Cash Account**  
`POST /api/gtn/trade/bo/v1.2/customer/account/cash`

Body (Postman-authored example, not verified live):
```json
{
    "customerNumber": "809494582",
    "currency": "USD"
}
```

**Delete Cash Account**  
`DELETE /api/gtn/trade/bo/v1.2/customer/account/cash`

Query params:
- `cashAccountNumber` — Cash account number of the cash account which wants to delete.

**Update Cash Account**  
`PATCH /api/gtn/trade/bo/v1.2/customer/account/cash`

Body (Postman-authored example, not verified live):
```json
{
    "cashAccountNumber": "C000131463",
    "currency": "USD"
}
```

**Get Cash Account**  
`GET /api/gtn/trade/bo/v1.2.1/customer/account/cash`

Query params:
- `cashAccountNumber` — Cash account number of the cash account which wants to get the details.

#### Customer Account

**Get Customer Account List**  
`GET /api/gtn/trade/bo/v1.2/customer/accounts`

Query params:
- `pageNo`
- `pageWidth`

> **Live example** (captured against the real JAZIRAPOC sandbox)
>
> Response (200):
> ```json
> {"status": "SUCCESS", "reason": "successfully retrieved customer details", "rejectCode": 0, "isNextPageAvailable": false, "pageNo": 1, "pageWidth": 20, "totalNoOfRecords": 9, "list": [{"customerNumber": "392754221", "gender": "Female"}, {"customerNumber": "987778399", "firstName": "Test", "lastName": "user", "gender": "Male", "...": "(more fields omitted)"}, "... 7 more"]}
> ```
>

**Get Customer Profiles List**  
`GET /api/gtn/trade/bo/v1.2/customer/profiles`

Query params:
- `pageNo`
- `pageWidth`

**Get Customer Profile**  
`GET /api/gtn/trade/bo/v1.2/customer/profile`

Query params:
- `profileId`

#### Exchange Account

**Create Exchange Account**  
`POST /api/gtn/trade/bo/v1.2/customer/account/exchange`

Body (Postman-authored example, not verified live):
```json
{
    "accountNumber": "P000128235",
    "exchange": "NSDQ"
}
```

**Delete Exchange Account**  
`DELETE /api/gtn/trade/bo/v1.2/customer/account/exchange`

Query params:
- `exchangeAccountId` — Id of the exchange account which wants to delete.

**Update Exchange Account**  
`PATCH /api/gtn/trade/bo/v1.2/customer/account/exchange`

Body (Postman-authored example, not verified live):
```json
{
    "exchangeAccountId": 123,
    "accountNumber": "P000128235"
}
```

**Get Exchange Account**  
`GET /api/gtn/trade/bo/v1.2.1/customer/account/exchange`

Query params:
- `exchangeAccountId` — Exchange account id.

> **Live example** (captured against the real JAZIRAPOC sandbox)
>
> Response (200):
> ```json
> {
>   "status": "SUCCESS",
>   "exchangeAccount": {
>     "customerNumber": "987778399",
>     "accountNumber": "P001799341",
>     "exchange": "NSDQ",
>     "exchangeAccountId": 5055389,
>     "exchangeAccountType": "2",
>     "exchangeCode": "NSDQ",
>     "status": "2",
>     "createdDate": "2026/08/06",
>     "tradingEnabled": 1,
>     "feedLevel": 0,
>     "isPriceEnabled": 1
>   },
>   "accountNumber": "P001799341",
>   "exchangeAccountId": 5055389
> }
> ```
>

**Enable Trading**  
`POST /api/gtn/trade/bo/v1.2/customer/account/exchange/trading-enable`

Body (Postman-authored example, not verified live):
```json
{
    "exchangeAccountId": 123,
    "status": 0
}
```

**Get Feed Level Details**  
`GET /api/gtn/trade/bo/v1.2/customer/account/exchange/feed-level`

Query params:
- `customerNumber` — If customer token is used to send the api request, customer number used to create that token will be considered.

#### Security Account

**Get Security Account**  
`GET /api/gtn/trade/bo/v1.2/customer/account/security`

Query params:
- `accountNumber` — Account number of the security account which wants to get details.

**Create Security Account**  
`POST /api/gtn/trade/bo/v1.2/customer/account/security`

Body (Postman-authored example, not verified live):
```json
{
    "cashAccountNumber": "C000131397",
    "securityAccountType": 2
}
```

**Delete Security Account**  
`DELETE /api/gtn/trade/bo/v1.2/customer/account/security`

Query params:
- `accountNumber` — Account number of the security account which wants to delete.

**Update Security Account**  
`PATCH /api/gtn/trade/bo/v1.2/customer/account/security`

Body (Postman-authored example, not verified live):
```json
{
    "accountNumber": "P000128310",
    "securityAccountType": "1"
}
```

**Define Trading Restrictions**  
`POST /api/gtn/trade/bo/v1.2.1/customer/account/security/trading-restriction`

Body (Postman-authored example, not verified live):
```json
{
    "restrictionType": "BUY",
    "manageType": "ENABLED",
    "accountNumbers": "P001133683,P001133684"
}
```

**Inspect Restricted Symbols**  
`GET /api/gtn/trade/bo/v1.2.1/customer/account/security/restricted-symbols`

Query params:
- `accountNumber` — Account number of the security account which wants to get details.
- `symbol`
- `exchange`
- `pageNo`
- `pageWidth`
- `restrictionType`

**Define Restricted Symbols**  
`POST /api/gtn/trade/bo/v1.2.1/customer/account/security/restricted-symbols`

Body (Postman-authored example, not verified live):
```json
{
    "restrictionType": "SELL",
    "exchange": "NSDQ",
    "symbol": "AAPL",
    "side": "REMOVE",
    "accountNumber": "P001151482"
}
```

### Funding

#### Cash Deposit

##### Individual Deposit

**Inspect Customer Deposit**  
`GET /api/gtn/trade/bo/v1.2.1/finance/deposit`

Query params:
- `customerNumber` — Customer Number of the customer.
- `cashAccountNumber` — Cash account number
- `startDate` — Start Date
- `endDate` — End Date
- `pageNo` — Page Number
- `pageWidth` — Page Width
- `requestId` — Request id

**Create Customer Deposit**  
`POST /api/gtn/trade/bo/v1.2.1/finance/deposit`

Body (Postman-authored example, not verified live):
```json
{
    "accountNumber": "P001133136",
    "cashAccountNumber": "C004088063",
    "toBankId": 367,
    "fromBankAccountNumber": "123456",
    "amount": 10,
    "currency": "USD",
    "depositType": "0",
    "chequeNumber": "11111",
    "chequeDate": "2025/02/02",
    "originatingBank": "ra_area",
    "originatingBankBranch": "ra_branch",
    "originatingBankAddress": "ra-street",
    "executionType": "DEFAULT"
}
```

##### Bulk Deposit

**Inspect Customer Bulk Deposit**  
`GET /api/gtn/trade/bo/v1.2.1/finance/deposit/bulk`

Query params:
- `extBulkRefNumber` — External Bulk Reference Number
- `extTxnRefNumber` — External Transaction Reference Number

**Create Customer Bulk Deposit**  
`POST /api/gtn/trade/bo/v1.2.1/finance/deposit/bulk`

Body (Postman-authored example, not verified live):
```json
{
    "extBulkRefNumber": "Fintech_API_DIFC_DEV_4",
    "list": [
        {
            "cashAccountNumber": "C004088063",
            "currency": "AED",
            "amount": 100,
            "txnType": "BANK",
            "extTxnRefNumber": "Fintech_API_DIFC_DEV_4_item_1"
        },
        {
            "cashAccountNumber": "C004088064",
            "currency": "USD",
            "amount": 10,
            "txnType": "CASH",
            "extTxnRefNumber": "Fintech_API_DIFC_DEV_4_item_2"
        },
        {
            "cashAccountNumber": "C004088065",
            "currency": "GBP",
            "amount": 20,
            "txnType": "CHEQUE",
            "extTxnRefNumber": "Fintech_API_DIFC_DEV_4_item_3"
        }
    ]
}
```

#### Cash Withdraw

##### Individual Withdraw

**Inspect Customer Withdrawal**  
`GET /api/gtn/trade/bo/v1.2.1/finance/withdraw`

Query params:
- `customerNumber` — Customer Number of the customer
- `cashAccountNumber` — Cash Account Number
- `startDate` — Start Date
- `endDate` — End Date
- `pageNo` — Page Number
- `pageWidth` — Page Width
- `requestId` — Request id

**Create Customer Withdrawal**  
`POST /api/gtn/trade/bo/v1.2.1/finance/withdraw`

Body (Postman-authored example, not verified live):
```json
{
    "status": "SUCCESS",
    "rejectCode": 0,
    "requestId": 1741150700487,
    "amount": 10,
    "currency": "USD",
    "cashAccountNumber": "C004088063",
    "toBankAccountNumber": "800800"
}
```

##### Bulk Withdraw

**Inspect Customer Bulk Withdraw**  
`GET /api/gtn/trade/bo/v1.2.1/finance/withdraw/bulk`

Query params:
- `extBulkRefNumber` — External Bulk Reference Number
- `extTxnRefNumber` — External Transaction Reference Number

**Create Customer Bulk Withdraw**  
`POST /api/gtn/trade/bo/v1.2.1/finance/withdraw/bulk`

Body (Postman-authored example, not verified live):
```json
{
    "extBulkRefNumber": "Fintech_API_DIFC_DEV_4",
    "list": [
        {
            "cashAccountNumber": "C004088063",
            "currency": "AED",
            "amount": 100,
            "txnType": "BANK",
            "extTxnRefNumber": "Fintech_API_DIFC_DEV_4_item_1"
        },
        {
            "cashAccountNumber": "C004088064",
            "currency": "USD",
            "amount": 10,
            "txnType": "CASH",
            "extTxnRefNumber": "Fintech_API_DIFC_DEV_4_item_2"
        },
        {
            "cashAccountNumber": "C004088065",
            "currency": "GBP",
            "amount": 20,
            "txnType": "CHEQUE",
            "extTxnRefNumber": "Fintech_API_DIFC_DEV_4_item_3"
        }
    ]
}
```

**Inspect Funding Transfer**  
`GET /api/gtn/trade/bo/v1.2.1/customer/account/cash/transfer`

Query params:
- `customerNumber` — Customer Number of the customer.
- `cashAccountNumber` — Cash account number
- `sDate` — Start Date
- `eDate` — End Date
- `pageNo` — Page Number
- `pageWidth`
- `requestId` — Request id
- `requestStatus` — Request id
- `filter` — Filter

**Create Funding Transfer**  
`POST /api/gtn/trade/bo/v1.2.1/customer/account/cash/transfer`

Body (Postman-authored example, not verified live):
```json
{
    "fromCashAccount": "C001085895",
    "toCashAccount": "C001085896",
    "amount": 100000000
}
```

**Manage Funding Block**  
`POST /api/gtn/trade/bo/v1.2.1/finance/block`

Body (Postman-authored example, not verified live):
```json
{
    "customerNumber": "253602837",
    "currency": "AED",
    "amount": 100,
    "cashAccountNumber": "C004088063",
    "cashAccReferenceNumber": "u_quintessentialbulletin",
    "operation": "ADD"
}
```

**Set Transaction Limit**  
`POST /api/gtn/trade/bo/v1.2.1/finance/transaction-limit`

Body (Postman-authored example, not verified live):
```json
{
    "cashAccountNumber": "C123456789",
    "restrictionType": "TRANSFER",
    "restrictionLevel": "ONLINE"
}
```

### Account Portfolio

#### Get Account Valuation

**Get Valuation for Security Account**  
`GET /api/gtn/trade/fo/v1.2.1/customer/account/security/valuation`

Query params:
- `accountNumber` — Security account number
- `toCurrency` — to currency

**Get Valuation For Cash Account**  
`GET /api/gtn/trade/fo/v1.2.1/customer/account/cash/valuation`

Query params:
- `cashAccountNumber` — Cash account number
- `toCurrency` — to currency

**Get Valuation For Customer Account**  
`GET /api/gtn/trade/fo/v1.2.1/customer/account/valuation`

Query params:
- `customerNumber` — Customer account number
- `referenceNumber` — Customer external reference number
- `toCurrency` — to currency

**Get Account Summary**  
`GET /api/gtn/trade/fo/v1.2.1/customer/account/cash/summary`

Query params:
- `accountNumber` — Security account number
- `cashAccountNumber` — cash account number
- `customerNumber` — required only when accountNumber is sent null with a server token
- `pageNo`
- `pageWidth`

> **Live example** (captured against the real JAZIRAPOC sandbox)
>
> Response (200):
> ```json
> {
>   "status": "SUCCESS",
>   "rejectCode": 0,
>   "isNextPageAvailable": false,
>   "pageNo": 1,
>   "pageWidth": 100,
>   "totalNoOfRecords": 1,
>   "list": [
>     {
>       "cashAccountNumber": "C004691771",
>       "accountNumber": "P001799341",
>       "currency": "USD",
>       "balance": 0.0,
>       "blockedAmount": 0.0,
>       "odLimit": 0.0,
>       "buyingPower": 0.0,
>       "cashForWithdrawal": 0.0,
>       "unsettledSales": 0.0,
>       "unrealizedGains": 0.0,
>       "customerNumber": "987778399"
>     }
>   ]
> }
> ```
>

**Get Positions**  
`GET /api/gtn/trade/fo/v1.2.1/customer/account/security/summary`

Query params:
- `accountNumber` — Security account number
- `customerNumber` — required only when accountNumber is sent null with a server token
- `exchange` — exchange code
- `pageNo`
- `pageWidth`

> **Live example** (captured against the real JAZIRAPOC sandbox)
>
> Response (200):
> ```json
> {
>   "status": "SUCCESS",
>   "reason": "positions not found",
>   "rejectCode": 0,
>   "isNextPageAvailable": false,
>   "pageNo": 1,
>   "pageWidth": 100,
>   "totalNoOfRecords": 0,
>   "list": []
> }
> ```
>

### Customer Reports

**Get Cash Statement**  
`GET /api/gtn/trade/bo/v1.2/statement/cash`

Query params:
- `month` — if current year is given, month must be current month or a previous month
- `year` — only accepts cuurent year or a previous year
- `customerNumber`
- `accountNumber` — Security account number
- `cashAccountNumber` — Cash account number
- `contentType` — currently only accepts json format

**Get Holding Statement**  
`GET /api/gtn/trade/bo/v1.2/statement/positions`

Query params:
- `year` — only accepts current year or a previous year
- `month` — if current year is given, month must be current month or a previous month
- `customerNumber`
- `accountNumber` — Security account number
- `contentType` — currently only accepts json format

**Stock Transactions**  
`GET /api/gtn/trade/bo/v1.2.1/statement/stock-transactions`

Query params:
- `customerNumber`
- `time` — UTC time.
- `pageNo`
- `pageWidth`
- `date` — today or yesterday

### Applied Corporate Action

**Cash**  
`GET /api/gtn/trade/bo/v1.2/statement/ca/cash`

Query params:
- `institutionCode`
- `customerNumber` — If customer token is used to send the api request, customer number used to create that token will be considered.
- `corporateActionType`
- `startDate`
- `endDate`
- `pageNo`
- `pageWidth`

**Positions**  
`GET /api/gtn/trade/bo/v1.2/statement/ca/positions`

Query params:
- `institutionCode`
- `customerNumber` — If customer token is used to send the api request, customer number used to create that token will be considered.
- `corporateActionType`
- `startDate`
- `endDate`
- `pageNo`
- `pageWidth`

### Master Data

**Get Institution Currency Rates**  
`GET /api/gtn/trade/bo/v1.2/master-data/currency-rates`

Query params:
- `currencyTypes` — Required currency pairs sent in the format as in example separated by commas.When adding more than one currency pair separated by commas, do not add a space in between

> **Live example** (captured against the real JAZIRAPOC sandbox)
>
> Response (200):
> ```json
> {
>   "status": "SUCCESS",
>   "institutionCurrencyRatesList": [
>     {
>       "fromCurrency": "MYR",
>       "toCurrency": "CAD",
>       "buyRate": "0.2909334045",
>       "sellRate": "0.2982449455"
>     },
>     "... many more currency pairs"
>   ]
> }
> ```
>

**Get Country List**  
`GET /api/gtn/trade/bo/v1.2/master-data/countries`

> **Live example** (captured against the real JAZIRAPOC sandbox)
>
> Live response is a large list (10-70+ entries); shape matches the other master-data endpoints above — `{"status":"SUCCESS", "<listName>": [...]}`. Not inlined here for length.
>

**Get Institutional Bank Accounts**  
`GET /api/gtn/trade/bo/v1.2.1/master-data/institution/bank-accounts`

**Get Support Trading Sessions**  
`GET /api/gtn/trade/bo/v1.2.1/master-data/exchange/trading-sessions`

Query params:
- `exchange`

**Get Exchange TIF Types**  
`GET /api/gtn/trade/bo/v1.2/master-data/exchange/tif-types`

Query params:
- `exchange`

> **Live example** (captured against the real JAZIRAPOC sandbox)
>
> Live response is a large list (10-70+ entries); shape matches the other master-data endpoints above — `{"status":"SUCCESS", "<listName>": [...]}`. Not inlined here for length.
>

**Get Exchange Order Types**  
`GET /api/gtn/trade/bo/v1.2/master-data/exchange/order-types`

Query params:
- `exchange`

> **Live example** (captured against the real JAZIRAPOC sandbox)
>
> Live response is a large list (10-70+ entries); shape matches the other master-data endpoints above — `{"status":"SUCCESS", "<listName>": [...]}`. Not inlined here for length.
>

**Get Institution Exchange List**  
`GET /api/gtn/trade/bo/v1.2/master-data/institution/exchanges`

> **Live example** (captured against the real JAZIRAPOC sandbox)
>
> Response (200):
> ```json
> {
>   "status": "SUCCESS",
>   "reason": "Exchange list retrieved successfully",
>   "list": [
>     {
>       "exchangeCode": "ADSM",
>       "description": "Abu Dhabi",
>       "preOpen": "0530",
>       "open": "0600",
>       "preClose": "0000",
>       "close": "1100"
>     },
>     {
>       "exchangeCode": "NSDQ",
>       "description": "Nasdaq",
>       "preOpen": "0000",
>       "open": "0000",
>       "preClose": "0000",
>       "close": "0000"
>     },
>     "... more exchanges"
>   ]
> }
> ```
>

**Get Bank Branch List**  
`GET /api/gtn/trade/bo/v1.2.1/master-data/bank/branches`

Query params:
- `bankId` — Get bank Ids from [Master Data> Get Institutional Bank Accounts](/docs/1.2.1/apis/manage/master-data/get-institutional-bank-accounts)

**Get Shariah Compliant Symbols**  
`GET /api/gtn/trade/bo/v1.2/master-data/symbols/sharia`

Query params:
- `exchange`
- `symbol` — This is optional. If not present response will include all the Shariah compliant symbols for the given exchange. If present response will indicate whether it's Shariah compliant or not.
- `clientClassification` — O ; General Symbol, 1 ; Client Compliant Symbol

**Get Institution Commission Groups**  
`GET /api/gtn/trade/bo/v1.2/master-data/commission/groups`

Query params:
- `exchange` — This is optional. If it presents, response indicates commission groups for the given exchange. If not response indicates all the commission groups for the institution.

**Get Whitelisted & Blacklisted Symbols**  
`GET /api/gtn/trade/bo/v1.2/master-data/symbols/tradable`

Query params:
- `exchange` — This is optional. If not present response will include all the whitelisted and blacklisted symbols for the institution. If present response will indicate whitelisted and blacklisted symbols for the given exchange.

**Get Past Traded Symbols List**  
`GET /api/gtn/trade/bo/v1.2/master-data/symbols/past-trade`

Query params:
- `customerNumber` — Customer number of the customer account which wants to get the details.
- `exchange` — Find exchange codes. [Master Data> Get Exchange List](/docs/1.2.1/apis/manage/master-data/get-institution-exchange-list)

**Get Settlement Holidays**  
`GET /api/gtn/trade/bo/v1.2/master-data/settlement/holidays`

Query params:
- `exchange`
- `currency`
- `year`
- `pageNo`
- `pageWidth`

> **Live example** (captured against the real JAZIRAPOC sandbox)
>
> Response (200):
> ```json
> {
>   "status": "SUCCESS",
>   "rejectCode": 0,
>   "holidays": [
>     {
>       "date": "2026/12/25",
>       "description": "Christmas",
>       "settleEnabled": 0,
>       "tradeEnabled": 0
>     },
>     {
>       "date": "2026/11/26",
>       "description": "Thanksgiving",
>       "settleEnabled": 0,
>       "tradeEnabled": 0
>     },
>     {
>       "date": "2026/11/11",
>       "description": "Veterans' Day",
>       "settleEnabled": 0,
>       "tradeEnabled": 1
>     },
>     {
>       "date": "2026/10/12",
>       "description": "Columbus Day",
>       "settleEnabled": 0,
>       "tradeEnabled": 1
>     },
>     {
>       "date": "2026/09/07",
>       "description": "Labor Day",
>       "settleEnabled": 0,
>       "tradeEnabled": 0
>     },
>     {
>       "date": "2026/07/03",
>       "description": "Independence Day OBS",
>       "settleEnabled": 0,
>       "tradeEnabled": 0
>     },
>     {
>       "date": "2026/06/19",
>       "description": "Juneteenth National Independence Day",
>       "settleEnabled": 0,
>       "tradeEnabled": 0
>     },
>     {
>       "date": "2026/05/25",
>       "description": "Memorial Day",
>       "settleEnabled": 0,
>       "tradeEnabled": 0
>     },
>     {
>       "date": "2026/04/03",
>       "description": "Good Friday",
>       "settleEnabled": 0,
>       "tradeEnabled": 0
>     },
>     {
>       "date": "2026/02/16",
>       "description": "Presidents' Day",
>       "settleEnabled": 0,
>       "tradeEnabled": 0
>     },
>     {
>       "date": "2026/01/19
>   ... (truncated for length)
> }
> ```
>

**Get Settlement Calendar**  
`GET /api/gtn/trade/bo/v1.2/master-data/settlement/calendar`

Query params:
- `exchange`
- `currency`
- `year`
- `pageNo`
- `pageWidth`

**Get Institution Configurations**  
`GET /api/gtn/trade/bo/v1.2/master-data/institution/config/app`

Query params:
- `configType` — type of the configuration

**Add Institution Configurations**  
`POST /api/gtn/trade/bo/v1.2/master-data/institution/config/app`

Query params:
- `type` — type of the configuration

**Get Fraction Enabled Symbols**  
`GET /api/gtn/trade/bo/v1.2.1/master-data/fractional/symbols`

Query params:
- `exchange` — exchange code you want to get the fraction enabled symbols
- `mic` — market identifier code
- `pageNo`
- `pageWidth`

**Get Institution Master Accounts**  
`GET /api/gtn/trade/bo/v1.2.1/institution/master-accounts`

**Create Sharia Symbol Bulk Upload**  
`PATCH /api/gtn/trade/bo/v1.2.1/master-data/symbols/sharia`

Body (Postman-authored example, not verified live):
```json
{
    "extBulkRefNumber": "Fintech_API_2025110308",
    "list": [
        {
            "exchange": "NSDQ",
            "symbol": "AAPL",
            "clientClassification": "GENERAL"
        },
        {
            "exchange": "NSDQ",
            "symbol": "AADI",
            "clientClassification": "CLIENT_COMPLIANT"
        }
    ]
}
```

**Create Sharia Symbol Bulk Removal**  
`DELETE /api/gtn/trade/bo/v1.2.1/master-data/symbols/sharia`

Body (Postman-authored example, not verified live):
```json
{
    "extBulkRefNumber": "Fintech_API_2025110308",
    "list": [
        {
            "exchange": "NSDQ",
            "symbol": "AAPL"
        },
        {
            "exchange": "NSDQ",
            "symbol": "AADI"
        }
    ]
}
```

**Get Sharia Symbol Bulk Update**  
`GET /api/gtn/trade/bo/v1.2.1/master-data/symbols/sharia/bulk`

Query params:
- `extBulkRefNumber` — External Bulk Reference Number

### EOD Data

**Get EOD File Data**  
`GET /api/gtn/trade/bo/v1.2.1/reporting/eod`

Query params:
- `fileType` — file type
- `date` — If date is not sent, current date will be considered.
- `format` — preferred format of retrieving eod data
- `pageNo`
- `pageWidth`

## MARKET DATA

### Ticker Details

#### Equity,Option

**Get Ticker Details**  
`GET /api/gtn/marketdata/tickers-all/keys/data`

Query params:
- `keys` — The list of keys of which the data is requested of.
- `lang` — The language requested.
- `required-fields` — The optional parameter which specifies the fields required in the response.
- `last-update-time` — The optional parameter which supports retrieval of data in delta mode.
- `response-type` — The response format for example json, csv or xml. The default is json.
- `rows` — Number of records per page in the response.
- `filter`
- `page` — The index of the page requested.

> **Live example** (captured against the real JAZIRAPOC sandbox)
>
> Response (200):
> ```json
> {
>   "response": {
>     "numFound": 5,
>     "start": 0,
>     "docs": [
>       {
>         "LANGUAGE_ID": "EN",
>         "SHORT_DESCRIPTION": "APPLE INC",
>         "KEY": "NSDQ~AAPL",
>         "TICKER_ID": "AAPL",
>         "SOURCE_ID": "NSDQ",
>         "CURRENCY_ID": "USD",
>         "ISIN_CODE": "US0378331005",
>         "LOT_SIZE": 1,
>         "DISPLAY_TICKER": "AAPL",
>         "STATUS": "1"
>       },
>       "... one row per LANGUAGE_ID for the same ticker"
>     ]
>   }
> }
> ```
>

**Get Source Details**  
`GET /api/gtn/marketdata/tickers-all/source/data`

Query params:
- `source-id` — The source id requested.
- `lang` — The language requested.
- `last-update-time` — The optional parameter which supports retrieval of data in delta mode.
- `response-type` — The response format for example json, csv or xml. The default is json.
- `rows` — Number of records per page in the response.
- `filter`
- `page` — The index of the page requested.

**Ticker Search**  
`GET /api/gtn/marketdata/symbol-search`

Query params:
- `username` — User's username for authentication
- `password` — User's password for authentication
- `exchanges` — Array of exchange codes to search within
- `keys` — search key (i.e. search string)
- `lang` — Language identifier for the search results
- `asset-class-id` — Asset class ID to filter the search results
- `ticker-classification-ids` — Array of ticker classification levels
- `search-symbol-code` — When set to true, the API will include symbol codes in its search. This can be useful when looking for specific ticker symbols rather than company names or descriptions.
- `search-store-symbol` — When set to true, the API will include stored symbols in its search.
- `omit-null` — Boolean flag to omit null values in TCLs
- `rows` — Number of rows to return per page
- `page` — Page number for pagination
- `time` — A timestamp used to bypass caching. If provided, this can force the API to return fresh data instead of cached results.

> **Live example** (captured against the real JAZIRAPOC sandbox)
>
> Response (403):
> ```json
> {
>   "path": "/symbol-search",
>   "error": "Forbidden",
>   "status": "403",
>   "message": "unauthorized service or exchange",
>   "errorCode": "1009",
>   "timestamp": "2026-08-06T14:22:07.464Z",
>   "reference": "6e0b6659-5414-4543-9b29-953311c1424b"
> }
> ```
>

#### Fixed Income

**Fixed Income - Get Source details**  
`GET /api/gtn/marketdata/fixed-income-tickers/source/data`

Query params:
- `source-id` — The source id of the exchange you want to request ticker details. Source id has to be authorized for your account.
- `response-type` — The response format for example json, csv or xml. The default is json.
- `lang` — The language requested.
- `page` — The index of the page requested.
- `rows` — Number of records per page in the response.
- `last-update-time` — The optional parameter which supports retrieval of data in delta mode.
- `filter`
- `required-fields` — The optional parameter which specifies the fields required in the response.

**Fixed Income - Get Ticker details**  
`GET /api/gtn/marketdata/fixed-income-tickers/keys/data`

Query params:
- `source-id` — The source id of the exchange you want to request ticker details. Source id has to be authorized for your account.
- `keys`
- `response-type` — The response format for example json, csv or xml. The default is json.
- `lang` — The language requested.
- `page` — The index of the page requested.
- `rows` — Number of records per page in the response.
- `last-update-time` — The optional parameter which supports retrieval of data in delta mode.
- `filter`
- `required-fields` — The optional parameter which specifies the fields required in the response.

**Get Accrued Interests**  
`GET /api/gtn/marketdata/calc/fixed-income/accrued-interests`

Query params:
- `source-id` — The source id of the exchange you want to see prices. Example: GTNFI
- `isins` — Comma separated isins list. Max 100 per request.

**Coupon Interest Calendar**  
`GET /api/gtn/marketdata/calc-serv/fixed-income/coupon-interest`

Query params:
- `source-id` — The source id of the exchange you want to see prices. Example: GTNFI
- `isin` — The isin of the bond
- `for-par` — value that indicates whether the result should be adjusted for the face value / par value or return result as a percentage.

#### Ticker List

**Get Ticker List**  
`GET /api/gtn/marketdata/tickers-all/source/keys`

Query params:
- `source-id` — The sourceId of the exchange you want to request data of. It will also be used for authorization.
- `last-update-time` — The optional parameter which supports retrieval of data in delta mode.
- `response-type` — The response format for example json, csv or xml. The default is json.
- `rows` — Number of records per page in the response.
- `page` — The index of the page requested.
- `filter`
- `filter-fields`

#### Mutual Funds

##### NAV Data

**Get Fund Nav Data By Source Id**  
`GET /api/gtn/marketdata/store/fund-nav/source/data`

Query params:
- `source-id` — The sourceId of the exchange you want to request data of. It will also be used for authorization.
- `ticker-id`
- `frequency`
- `start-date` — start-date and end-date filter will only be applied, if both start-date and end-date provided. Dates are inclusive within the filter.
- `end-date` — start-date and end-date filter will only be applied, if both start-date and end-date provided. Dates are inclusive within the filter
- `required-fields` — Provide the fields which need to be received in the response. If required-fields not provided, all fields will be received in the response.
- `last-update-time` — Date should be in yyyyMMddHHmmss format and this will apply a 'greater than or equal' filter
- `response-type` — The response format for example json, csv or xml. The default is json.
- `rows` — Number of records per page in the response.
- `page` — The index of the page requested.
- `time` — Send any value to receive disabled cache responses
- `sort-field` — Response will be sorted depending on this field.
- `sort-asc` — Should the response be sorted in ascending order.

**Get Fund NAV Data By Keys**  
`GET /api/gtn/marketdata/store/fund-nav/keys/data`

Query params:
- `keys` — The list of keys of which the data is requested of.
- `source-id` — The sourceId of the exchange you want to request data of. It will also be used for authorization.
- `start-date` — start-date and end-date filter will only be applied, if both start-date and end-date provided. Dates are inclusive within the filter.
- `end-date` — start-date and end-date filter will only be applied, if both start-date and end-date provided. Dates are inclusive within the filter
- `required-fields` — Provide the fields which need to be received in the response. If required-fields not provided, all fields will be received in the response.
- `last-update-time` — Date should be in yyyyMMddHHmmss format and this will apply a 'greater than or equal' filter
- `response-type` — The response format for example json, csv or xml. The default is json.
- `rows` — Number of records per page in the response.
- `page` — The index of the page requested.
- `time` — Send any value to receive disabled cache responses
- `sort-field` — Response will be sorted depending on this field.
- `sort-asc` — Should the response be sorted in ascending order.

**Get Latest Fund NAV Data By Keys**  
`GET /api/gtn/marketdata/store/fund-nav/data/latest`

Query params:
- `keys` — The list of keys of which the data is requested of.
- `lang` — The language requested.
- `required-fields` — The optional parameter which specifies the fields required in the response.
- `last-update-time` — The optional parameter which supports retrieval of data in delta mode.
- `response-type` — The response format for example json, csv or xml. The default is json.
- `rows` — Number of records per page in the response.
- `filter`
- `page` — The index of the page requested.

**Get Fund Ticker List**  
`GET /api/gtn/marketdata/store/symbols/source/keys`

Query params:
- `source-id` — The sourceId of the exchange you want to request data of. It will also be used for authorization.
- `frequencies`
- `last-update-time` — The optional parameter which supports retrieval of data in delta mode.
- `response-type` — The response format for example json, csv or xml. The default is json.
- `rows` — Number of records per page in the response.
- `page` — The index of the page requested.
- `filter`
- `filter-fields` — This can be used to apply custom single queries.

**Get Fund Ticker Details**  
`GET /api/gtn/marketdata/store/symbols/keys/data`

Query params:
- `keys` — The list of keys of which the data is requested of.
- `source-id` — The sourceId of the exchange you want to request data of. It will also be used for authorization.
- `frequencies`
- `required-fields` — The optional parameter which specifies the fields required in the response.
- `last-update-time` — The optional parameter which supports retrieval of data in delta mode.
- `response-type` — The response format for example json, csv or xml. The default is json.
- `rows` — Number of records per page in the response.
- `filter`
- `page` — The index of the page requested.
- `filter-fields` — This can be used to apply custom single queries.

**Get Fund Source Details**  
`GET /api/gtn/marketdata/store/symbols/source/data`

Query params:
- `source-id` — The source id requested.
- `frequencies`
- `last-update-time` — The optional parameter which supports retrieval of data in delta mode.
- `required-fields` — The optional parameter which specifies the fields required in the response.
- `response-type` — The response format for example json, csv or xml. The default is json.
- `rows` — Number of records per page in the response.
- `filter`
- `page` — The index of the page requested.
- `filter-fields` — This can be used to apply custom single queries.

#### Instrument Details

**Get Source Details**  
`GET /api/gtn/marketdata/v2/tickers-all/source/data`

Query params:
- `source-id` — The source id requested.
- `lang` — The language requested.
- `last-update-time` — The optional parameter which supports retrieval of data in delta mode.
- `response-type` — The response format for example json, csv or xml. The default is json.
- `rows` — Number of records per page in the response.
- `filter`
- `page` — The index of the page requested.

**Get Ticker Details**  
`GET /api/gtn/marketdata/v2/tickers-all/keys/data`

Query params:
- `keys` — The list of keys of which the data is requested of.
- `lang` — The language requested.
- `required-fields` — The optional parameter which specifies the fields required in the response.
- `last-update-time` — The optional parameter which supports retrieval of data in delta mode.
- `response-type` — The response format for example json, csv or xml. The default is json.
- `rows` — Number of records per page in the response.
- `filter`
- `page` — The index of the page requested.

> **Live example** (captured against the real JAZIRAPOC sandbox)
>
> Response (200):
> ```json
> {
>   "response": {
>     "numFound": 5,
>     "start": 0,
>     "docs": [
>       {
>         "LANGUAGE_ID": "EN",
>         "SHORT_DESCRIPTION": "APPLE INC",
>         "KEY": "NSDQ~AAPL",
>         "TICKER_ID": "AAPL",
>         "SOURCE_ID": "NSDQ",
>         "CURRENCY_ID": "USD",
>         "ISIN_CODE": "US0378331005",
>         "LOT_SIZE": 1,
>         "DISPLAY_TICKER": "AAPL",
>         "STATUS": "1"
>       },
>       "... one row per LANGUAGE_ID for the same ticker"
>     ]
>   }
> }
> ```
>

### Chart Data

#### History

**Get Updated Symbols**  
`GET /api/gtn/marketdata/history/source/keys`

Query params:
- `source-id` — The sourceId of the exchange you want to request history data of. It will also be used for authorization.
- `start-date` — The start date of the range for filtering records on TRANSACTION_DATE.
- `end-date` — The end date of the range for filtering records on TRANSACTION_DATE.
- `last-update-time` — The optional parameter which supports retrieval of data in delta mode.
- `response-type` — The response format for example json, csv or xml. The default is json.
- `rows` — Number of records per page in the response.
- `page` — The index of the page requested.

**Get History For Symbols**  
`GET /api/gtn/marketdata/history/keys/data`

Query params:
- `source-id` — The sourceId of the exchange you want to request history data of. It will also be used for authorization.
- `start-date` — The start date of the range for filtering records on TRANSACTION_DATE.
- `end-date` — The end date of the range for filtering records on TRANSACTION_DATE.
- `keys` — The list of keys of which the data is requested of.
- `last-update-time` — The optional parameter which supports retrieval of data in delta mode.
- `required-fields` — The optional parameter which specifies the fields required in the response.
- `response-type` — The response format for example json, csv or xml. The default is json.
- `rows` — Number of records per page in the response.
- `page` — The index of the page requested.
- `sort-field`
- `sort-asc`

**Get History For Source Id**  
`GET /api/gtn/marketdata/history/source/data`

Query params:
- `source-id` — The sourceId of the exchange you want to request history data of. It will also be used for authorization.
- `ticker-id` — The tickerId of the exchange you want to request history data of.
- `start-date` — The start date of the range for filtering records on TRANSACTION_DATE.
- `end-date` — The end date of the range for filtering records on TRANSACTION_DATE.
- `last-update-time` — The optional parameter which supports retrieval of data in delta mode.
- `required-fields` — The optional parameter which specifies the fields required in the response.
- `response-type` — The response format for example json, csv or xml. The default is json.
- `rows` — Number of records per page in the response.
- `page` — The index of the page requested.
- `sort-field`
- `sort-asc`

#### RealTime

**Source Keys**  
`GET /api/gtn/marketdata/realtime/source/keys`

Query params:
- `source-id`
- `last-update-time`
- `response-type`
- `rows`
- `page`
- `filter`
- `filter-fields`

**Source Data**  
`GET /api/gtn/marketdata/realtime/source/data`

Query params:
- `source-id`
- `lang`
- `required-fields`
- `last-update-time`
- `response-type`
- `rows`
- `page`
- `filter`
- `filter-fields`
- `ignore-status`

**Keys Data**  
`GET /api/gtn/marketdata/realtime/keys/data`

Query params:
- `keys`
- `lang`
- `required-fields`
- `last-update-time`
- `response-type`
- `rows`
- `filter`
- `page`

#### Intraday

**Source Keys**  
`GET /api/gtn/marketdata/intraday/source/keys`

Query params:
- `source-id`
- `start-date`
- `end-date`
- `last-update-time`
- `response-type`
- `rows`
- `page`
- `time`

**Source Data**  
`GET /api/gtn/marketdata/intraday/source/data`

Query params:
- `source-id`
- `ticker-id`
- `start-date`
- `end-date`
- `last-update-time`
- `required-fields`
- `response-type`
- `rows`
- `page`
- `time`

**Keys Data**  
`GET /api/gtn/marketdata/intraday/keys/data`

Query params:
- `source-id`
- `start-date`
- `end-date`
- `keys`
- `last-update-time`
- `required-fields`
- `response-type`
- `rows`
- `page`
- `sort-field`
- `sort-asc`
- `time`

#### Intraday-5

**Source Keys**  
`GET /api/gtn/marketdata/intraday_5/source/keys`

Query params:
- `source-id`
- `start-date`
- `end-date`
- `last-update-time`
- `response-type`
- `rows`
- `page`
- `time`

**Source Data**  
`GET /api/gtn/marketdata/intraday_5/source/data`

Query params:
- `source-id`
- `ticker-id`
- `start-date`
- `end-date`
- `last-update-time`
- `required-fields`
- `response-type`
- `rows`
- `page`
- `time`

**Keys Data**  
`GET /api/gtn/marketdata/intraday_5/keys/data`

Query params:
- `source-id`
- `start-date`
- `end-date`
- `keys`
- `last-update-time`
- `required-fields`
- `response-type`
- `rows`
- `page`
- `sort-field`
- `sort-asc`
- `time`

#### Intraday-15

**Source Keys**  
`GET /api/gtn/marketdata/intraday_15/source/keys`

Query params:
- `source-id`
- `start-date`
- `end-date`
- `last-update-time`
- `response-type`
- `rows`
- `page`
- `time`

**Source Data**  
`GET /api/gtn/marketdata/intraday_15/source/data`

Query params:
- `source-id`
- `ticker-id`
- `start-date`
- `end-date`
- `last-update-time`
- `required-fields`
- `response-type`
- `rows`
- `page`
- `time`

**Keys Data**  
`GET /api/gtn/marketdata/intraday_15/keys/data`

Query params:
- `source-id`
- `start-date`
- `end-date`
- `keys`
- `last-update-time`
- `required-fields`
- `response-type`
- `rows`
- `page`
- `sort-field`
- `sort-asc`
- `time`

#### Intraday-30

**Source Keys**  
`GET /api/gtn/marketdata/intraday_30/source/keys`

Query params:
- `source-id`
- `start-date`
- `end-date`
- `last-update-time`
- `response-type`
- `rows`
- `page`
- `time`

**Source Data**  
`GET /api/gtn/marketdata/intraday_30/source/data`

Query params:
- `source-id`
- `ticker-id`
- `start-date`
- `end-date`
- `last-update-time`
- `required-fields`
- `response-type`
- `rows`
- `page`
- `time`

**Keys Data**  
`GET /api/gtn/marketdata/intraday_30/keys/data`

Query params:
- `source-id`
- `start-date`
- `end-date`
- `keys`
- `last-update-time`
- `required-fields`
- `response-type`
- `rows`
- `page`
- `sort-field`
- `sort-asc`
- `time`

#### Intraday-60

**Source Keys**  
`GET /api/gtn/marketdata/intraday_60/source/keys`

Query params:
- `source-id`
- `start-date`
- `end-date`
- `last-update-time`
- `response-type`
- `rows`
- `page`
- `time`

**Source Data**  
`GET /api/gtn/marketdata/intraday_60/source/data`

Query params:
- `source-id`
- `ticker-id`
- `start-date`
- `end-date`
- `last-update-time`
- `required-fields`
- `response-type`
- `rows`
- `page`
- `time`

**Keys Data**  
`GET /api/gtn/marketdata/intraday_60/keys/data`

Query params:
- `source-id`
- `start-date`
- `end-date`
- `keys`
- `last-update-time`
- `required-fields`
- `response-type`
- `rows`
- `page`
- `sort-field`
- `sort-asc`
- `time`

### News and Announcement

#### News

**Get Updated News Items**  
`GET /api/gtn/marketdata/news-gtn/source/keys`

Query params:
- `source-id` — The sourceId of the exchange you want to request news data of. It will also be used for authorization.
- `start-date` — start-date and end-date filter will only be applied, if both start-date and end-date provided. Dates are inclusive within the filter
- `end-date` — start-date and end-date filter will only be applied, if both start-date and end-date provided. Dates are inclusive within the filter
- `last-update-time` — The optional parameter which supports retrieval of data in delta mode.
- `response-type` — The response format for example json, csv or xml. The default is json.
- `rows` — Number of records per page in the response.
- `page` — The index of the page requested.
- `filter` — This can be use to apply custom complex queries.
- `filter-fields` — This can be used to apply custom single queries.
- `time` — Send any value to receive disabled cache responses

**Get News by Provider/Exchange**  
`GET /api/gtn/marketdata/news-gtn/source/data`

Query params:
- `source-id` — The sourceId of the exchange you want to request news data of. It will also be used for authorization.
- `start-date` — start-date and end-date filter will only be applied, if both start-date and end-date provided. Dates are inclusive within the filter
- `end-date` — start-date and end-date filter will only be applied, if both start-date and end-date provided. Dates are inclusive within the filter
- `lang` — The language requested.
- `required-fields` — Provide the fields which need to be received in the response. If required-fields not provided, all fields will be received in the response.
- `last-update-time` — The optional parameter which supports retrieval of data in delta mode.
- `response-type` — The response format for example json, csv or xml. The default is json.
- `rows` — Number of records per page in the response.
- `page` — The index of the page requested.
- `filter` — This can be use to apply custom complex queries.
- `filter-fields` — This can be used to apply custom single queries.
- `time` — Send any value to receive disabled cache responses
- `sort-field` — Response will be sorted depending on this field.
- `sort-asc`

**Get News**  
`GET /api/gtn/marketdata/news-gtn/keys/data`

Query params:
- `source-id` — The sourceId of the exchange you want to request news data of. It will also be used for authorization.
- `keys` — The list of keys of which the data is requested of.
- `start-date` — start-date and end-date filter will only be applied, if both start-date and end-date provided. Dates are inclusive within the filter
- `end-date` — start-date and end-date filter will only be applied, if both start-date and end-date provided. Dates are inclusive within the filter
- `required-fields` — Provide the fields which need to be received in the response. If required-fields not provided, all fields will be received in the response.
- `last-update-time` — The optional parameter which supports retrieval of data in delta mode.
- `response-type` — The response format for example json, csv or xml. The default is json.
- `rows` — Number of records per page in the response.
- `filter` — This can be use to apply custom complex queries.
- `page` — The index of the page requested.
- `lang` — The language requested.
- `time` — Send any value to receive disabled cache responses
- `sort-field` — Response will be sorted depending on this field.
- `sort-asc`

#### Announcements

**Get Updated Announcement Items**  
`GET /api/gtn/marketdata/announcements/source/keys`

Query params:
- `source-id` — The sourceId of the exchange you want to request announcement data of. It will also be used for authorization.
- `start-date` — start-date and end-date filter will only be applied, if both start-date and end-date provided. Dates are inclusive within the filter
- `end-date` — start-date and end-date filter will only be applied, if both start-date and end-date provided. Dates are inclusive within the filter
- `last-update-time` — The optional parameter which supports retrieval of data in delta mode.
- `response-type` — The response format for example json, csv or xml. The default is json.
- `rows` — Number of records per page in the response.
- `page` — The index of the page requested.
- `filter` — This can be use to apply custom complex queries.

**Get Announcemnets by Exchange**  
`GET /api/gtn/marketdata/announcements/source/data`

Query params:
- `source-id` — The sourceId of the exchange you want to request announcement data of. It will also be used for authorization.
- `start-date` — start-date and end-date filter will only be applied, if both start-date and end-date provided. Dates are inclusive within the filter
- `end-date` — start-date and end-date filter will only be applied, if both start-date and end-date provided. Dates are inclusive within the filter
- `lang` — The language requested.
- `required-fields` — Provide the fields which need to be received in the response. If required-fields not provided, all fields will be received in the response.
- `last-update-time` — The optional parameter which supports retrieval of data in delta mode.
- `response-type` — The response format for example json, csv or xml. The default is json.
- `rows` — Number of records per page in the response.
- `page` — The index of the page requested.
- `filter` — This can be use to apply custom complex queries.
- `sort-field` — Response will be sorted depending on this field.
- `sort-asc`

**Get Announcements**  
`GET /api/gtn/marketdata/announcements/keys/data`

Query params:
- `source-id` — The sourceId of the exchange you want to request announcement data of. It will also be used for authorization.
- `keys` — The list of keys of which the data is requested of.
- `start-date` — start-date and end-date filter will only be applied, if both start-date and end-date provided. Dates are inclusive within the filter
- `end-date` — start-date and end-date filter will only be applied, if both start-date and end-date provided. Dates are inclusive within the filter
- `required-fields` — Provide the fields which need to be received in the response. If required-fields not provided, all fields will be received in the response.
- `last-update-time` — The optional parameter which supports retrieval of data in delta mode.
- `response-type` — The response format for example json, csv or xml. The default is json.
- `rows` — Number of records per page in the response.
- `filter` — This can be use to apply custom complex queries.
- `page` — The index of the page requested.
- `lang` — The language requested.
- `sort-field` — Response will be sorted depending on this field.
- `sort-asc`

### Corporate Action

**CA list For Given Exchange**  
`GET /api/gtn/marketdata/corporate-actions/source/keys`

Query params:
- `source-id` — This service is used to get the latest corporate action data per symbol for all the symbols of an exchange specified by request parameter source-id.
- `action-type` — Required corporate action type.
- `start-date` — The start date of the range for filtering records on EFFECTIVE_DATE.
- `end-date` — The end date of the range for filtering records on EFFECTIVE _DATE.
- `last-update-time` — The optional parameter which supports retrieval of data in delta mode.
- `response-type` — The response format for example json, csv or xml. The default is json.
- `rows` — Number of records per page in the response.
- `page` — The index of the page requested.

**CA Detail For Given Exchanges**  
`GET /api/gtn/marketdata/corporate-actions/source/data`

Query params:
- `source-id` — The sourceId of the exchange you want to request corporate action data of. It will also be used for authorization.
- `action-type`
- `start-date` — The start date of the range for filtering records on EFFECTIVE_DATE.
- `end-date` — The end date of the range for filtering records on EFFECTIVE _DATE.
- `last-update-time` — The optional parameter which supports retrieval of data in delta mode.
- `required-fields` — The optional parameter which specifies the fields required in the response.
- `response-type` — The response format for example json, csv or xml. The default is json.
- `rows` — Number of records per page in the response.
- `page` — Number of records per page in the response.

**CA Detail For Given List Of Tickers**  
`GET /api/gtn/marketdata/corporate-actions/keys/data`

Query params:
- `keys` — The list of keys of which the data is requested of.
- `action-type` — Required corporate action type.
- `start-date` — The start date of the range for filtering records on EFFECTIVE_DATE.
- `end-date` — The end date of the range for filtering records on EFFECTIVE _DATE.
- `last-update-time` — The optional parameter which supports retrieval of data in delta mode.
- `required-fields` — Required corporate action type.
- `response-type` — The response format for example json, csv or xml. The default is json.
- `rows` — Number of records per page in the response.
- `page` — The index of the page requested.

**Latest CA Detail Of Given Ticker**  
`GET /api/gtn/marketdata/corporate-actions/latest`

Query params:
- `source-id` — This service is used to get the latest corporate action data per symbol for all the symbols of an exchange specified by request parameter source-id.
- `action-type` — Required corporate action type.
- `keys`
- `response-type` — The response format for example json, csv or xml. The default is json.
- `rows` — The response format for example json, csv or xml. The default is json.
- `page` — The index of the page requested.

### Option Chain

**Get Option Chain Details**  
`GET /api/gtn/marketdata/option-chain`

Query params:
- `month` — Which month you want the dates? -> if not specified latest months will be returned
- `reques-id` — sent by clients to identify the response -> this will be returned to the client as it is.
- `ticker-id`
- `source-id`

> **Live example** (captured against the real JAZIRAPOC sandbox)
>
> Response (403):
> ```json
> {
>   "path": "/option-chain",
>   "error": "Forbidden",
>   "status": "403",
>   "message": "unauthorized service or exchange",
>   "errorCode": "1009",
>   "timestamp": "2026-08-06T14:24:04.886Z",
>   "reference": "df709cc1-5307-4029-8c39-dc7bbecdedd0"
> }
> ```
>

### Top Stock

**Get Top Gainers & Losers**  
`GET /api/gtn/marketdata/top-stocks/source/data`

Query params:
- `source-id` — The source Id of the exchange you want to request top stocks. It will also be used for authorization. Only a single source ID can be given per request.
- `response-type` — The response format.
- `rows` — Number of records per page in the response.
- `page` — The index of the page requested.
- `filter` — Filter the response further using queries in solr query syntax. Always TOP_STOCK_TYPE should be given. Single or multiple TOP_STOCK_TYPES can be given. Recommended - TOP_STOCK_TYPE:(1 3 4 6)
- `sort-field` — The field on which the response should be sorted of. Any field can be given.
- `sort-asc` — Whether to sort in ascending order or descending order.
