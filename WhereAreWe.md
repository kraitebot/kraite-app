# WhereAreWe — 2026-07-19 (first mobile slice built)

## Current state

The Expo/React Native iPhone project now lives at the repository root. It has
a native development build, secure login flow, live dashboard client, account
switching, foreground-only refresh, light/dark themes, and the agreed
navigation skeleton. The folder is not yet a Git repository and Apple signing
and distribution remain pending.

## Approved first slice

- Expo iPhone app using the same base stack and patterns as Traveliny.
- Password login with secure local token storage.
- Read-only trader dashboard with account switching.
- Four KPI tiles: portfolio value, today's realised P&L, 30-day P&L, and
  open-position long/short split.
- Native open-position tiles based on the trader dashboard information.
- Auto-refresh toggle enabled by default, polling every 10 seconds only while
  the app is active. No background polling.
- Navigation stubs for Positions, Projections, Accounts, Billing, and Profile.
  Only Dashboard works in the first slice.
- Premium Kraite-specific UI using the website logo, brand colours, and matched
  light/dark themes, informed by strong crypto and forex mobile products.

## Architecture boundary

- `kraite.app` contains mobile UI and client behavior only.
- The app calls versioned REST endpoints at `https://api.kraite.com/v1`.
- REST endpoints live in the existing `admin.kraite` Laravel project and run
  on pheme under the API hostname. No new backend project is created.
- `ingestion.kraite` remains private trading machinery: scheduler, streams,
  dispatch, and workers. Public mobile requests never enter that runtime.
- First-party mobile authentication uses revocable read-only bearer tokens.
  Full OAuth delegation is deferred until third-party clients exist.
- Every account read is scoped to the authenticated trader. Login and data
  routes are throttled, dashboard payloads are bounded and cheap to serve, and
  the design assumes attackers know every endpoint.

## External gate

Apple Developer Program identity verification remains with Apple Support.
Local simulator and development work may proceed while distribution waits.

## Implemented server boundary

- `admin.kraite` serves `api.kraite.com/v1/auth/token`,
  `api.kraite.com/v1/dashboard`, and token logout.
- Sanctum tokens are stored hashed server-side, expire after 30 days, and only
  carry `dashboard:read`.
- Login and dashboard routes are throttled. Account reads never grant the web
  dashboard's sysadmin cross-user override.
- The mobile response reuses the proven dashboard calculations but omits the
  activity, connectivity, BTC, and BSCS queries. It is cached for five seconds.
- The shared `kraitebot/core` schema owns the personal access token migration.

## Verification

- Native iOS simulator build: succeeded with zero Xcode warnings.
- iOS JavaScript export: succeeded.
- TypeScript: clean.
- Expo Doctor: 20/20 checks.
- Mobile refresh policy unit test: passed.
- Mobile API security tests: 6 passed.
- Full admin test suite: 156 passed, 738 assertions.
