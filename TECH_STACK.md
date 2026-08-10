# Technical Stack

A single GTN Trade API integration (institution `JAZIRAPOC`, sandbox), exposed through
one shared backend to a web app and a native Android app.

```
┌─────────────────┐     ┌──────────────────┐     ┌───────────────────────┐
│  React web app   │     │  Expo mobile app  │     │  (any future client)   │
│  (Vite, browser) │     │  (Android APK)    │     │                        │
└────────┬─────────┘     └─────────┬─────────┘     └───────────┬───────────┘
         │  HTTPS + WSS            │  HTTPS + WSS               │
         └────────────┬────────────┴─────────────────────────────┘
                       ▼
         ┌────────────────────────────────┐
         │   .NET 8 backend (Render)       │
         │   gtn-trading-api.onrender.com  │
         │   — owns GTN credentials         │
         │   — RS256 JWT institution auth   │
         │   — WebSocket proxy (/ws/trade)  │
         └───────────────┬─────────────────┘
                          │ HTTPS + WSS
                          ▼
         ┌────────────────────────────────┐
         │  GTN Trade API (sandbox)        │
         │  sandbox.globaltradingnetwork.  │
         │  com — trade, market-data, WS   │
         └────────────────────────────────┘
```

The backend is the only thing that ever holds GTN credentials (App Key/Secret, RSA
private key). Every client — web or mobile — talks only to the backend over plain
HTTPS/WSS with no GTN-specific auth of its own beyond a customer number.

---

## Backend — `backend/`

| | |
|---|---|
| Runtime | .NET 8 (`net8.0`), ASP.NET Core Web API |
| Language | C# |
| Key packages | `System.IdentityModel.Tokens.Jwt` 8.22.0 (RS256 JWT assertions for GTN auth), `Swashbuckle.AspNetCore` 6.6.2 (OpenAPI/Swagger) |
| Auth to GTN | RS256-signed JWT assertion (`GtnAuthService`) exchanged at `POST /trade/auth/token`, cached and auto-refreshed. Customer-level sessions minted via `POST /trade/auth/customer/token`, using the institution token to vouch for a customer number (`AuthController`) |
| REST endpoints | Typed controllers for the hot paths (`OrdersController`, `MarketDataController`, `AuthController`) plus `GtnProxyController` — a generic authenticated pass-through (`/api/gtn/trade/**`, `/api/gtn/marketdata/**`) covering the rest of GTN's ~140-endpoint surface without hand-writing each one |
| Real-time | Native `System.Net.WebSockets` (`ClientWebSocket` outbound to GTN, `HttpContext.WebSockets` inbound from clients) — a raw proxy at `/ws/trade`, since GTN's actual live-events channel is an undocumented WebSocket, not the REST SSE endpoint the docs describe (see `backend/docs/websocket-events.md`) |
| Config | `appsettings.json` (placeholders, safe to commit) + `appsettings.Development.json` (real sandbox secrets, gitignored) bound to a typed `GtnOptions`; in production, the same keys are supplied as environment variables (`Gtn__AppKey`, `Gtn__PrivateKeyHex`, etc. — ASP.NET Core's `__` hierarchy separator) |
| CORS | Locked to a single configured `Frontend:Origin` (the web app's dev origin) — irrelevant to the mobile app, since native HTTP clients aren't subject to CORS |
| Docs | `backend/docs/gtn-api-reference.md` — every GTN endpoint, generated programmatically from the vendor's Postman collection (not hand-transcribed), with real captured request/response examples for the ones exercised live. `backend/docs/websocket-events.md` — the reverse-engineered WS protocol |

## Web frontend — `frontend/`

| | |
|---|---|
| Framework | React 19 + Vite 8 (`@vitejs/plugin-react`), TypeScript ~6.0 |
| State | Zustand 5 (watchlist/quotes store), TanStack React Query 5 (server-state caching, polling) |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) |
| HTTP | Axios |
| Real-time | Native browser `WebSocket` → backend's `/ws/trade` |
| Linting | oxlint |

## Mobile app — `mobile/`

| | |
|---|---|
| Framework | Expo SDK 57 (React Native 0.86.2, React 19.2.3), managed workflow with a generated `android/` native project (`expo prebuild`) |
| Language | TypeScript |
| Navigation | React Navigation 7 (bottom tabs) — Home, Watchlist, Trade, Orders, Events, gated behind a Login screen |
| State | TanStack React Query 5 (also used as a lightweight local store for "recently placed orders" via `queryClient.setQueryData`, no extra state library) |
| Auth persistence | `expo-secure-store` (customer session JWT + refresh token, Android Keystore-backed) |
| HTTP | Axios, base URL from `EXPO_PUBLIC_API_URL` (baked into the JS bundle at build time — the app has **no** runtime config screen) |
| Real-time | Native RN `WebSocket` → the same backend `/ws/trade` proxy |
| Design | Custom theme (`src/theme/colors.ts`) modeled on a reference broker-app design (warm cream/brown palette, dark bottom nav with a circular Trade FAB) |
| Platform target | Android only so far (APK builds via Gradle); iOS was run once through Expo Go for early UI verification but has no native build artifact |

---

## Deployment

### Backend → Render (Docker)

- **Live URL**: `https://gtn-trading-api.onrender.com`
- **Source**: [`github.com/mimranaiwork/gtn-trading-platform`](https://github.com/mimranaiwork/gtn-trading-platform) (public), root directory `backend/`, auto-deploy on push to `main`
- **Build**: `backend/Dockerfile` — multi-stage (`mcr.microsoft.com/dotnet/sdk:8.0` build → `mcr.microsoft.com/dotnet/aspnet:8.0` runtime), listens on `0.0.0.0:8080`
- **Plan**: Free tier (`oregon` region) — spins down after ~15 min idle; first request after idle takes a few extra seconds to cold-start
- **Secrets**: set as Render environment variables at service-creation time (`Gtn__AppKey`, `Gtn__AppSecret`, `Gtn__PrivateKeyHex`, `Gtn__InstitutionCode`, etc.) — never committed to git
- **Managed via**: Render CLI (`render services`, `render deploys`, `render logs`), not the dashboard

### Web frontend → not yet deployed

Currently runs locally only (`npm run dev`, Vite dev server). `frontend/.env`
(`VITE_API_URL`) would need to point at the Render URL and the backend's
`Frontend:Origin` CORS setting updated to match before deploying anywhere
(e.g. Vercel/Netlify for a static Vite build).

### Mobile app → Android APK, sideloaded (no store listing)

- **Build**: local Gradle build (`cd mobile/android && ./gradlew assembleRelease`) against a `expo prebuild`-generated native project — no EAS/Expo cloud build service used
- **Config baked in at build time**: `mobile/.env` → `EXPO_PUBLIC_API_URL=https://gtn-trading-api.onrender.com`, embedded into the release JS bundle, so the APK works on any network (WiFi or mobile data) with no local machine dependency
- **Distribution**: `adb install` over USB, or the APK file shared directly — **not** published to Google Play (that requires a $25 one-time Google Play Console account the user would need to set up themselves)
- **Signing**: default Expo/Gradle debug-derived release signing — fine for sideloading and testing, would need a proper release keystore before any Play Store submission

### Source control

- GitHub repo: `mimranaiwork/gtn-trading-platform` (public — contains no real secrets;
  `appsettings.Development.json`, `mobile/.env`, `*.pem`/`*.der`, and all build
  artifacts are gitignored)
- Auth: `gh` CLI, already authenticated as `mimranaiwork`

---

## External dependency

**GTN Trade API** (Global Trading Network), sandbox environment, institution
`JAZIRAPOC` (Al Jazira Capital). Three base URLs:
`sandbox.globaltradingnetwork.com/trade` (REST), `/market-data` (REST), and
`/trade/websocket` (the real-time feed, undocumented — see
`backend/docs/websocket-events.md`). Institution-level auth is RS256 JWT
bearer-assertion (RFC 7523-style, GTN-specific claims); customer-level sessions are
minted server-side by vouching for a customer number — there is no password in this
flow.
