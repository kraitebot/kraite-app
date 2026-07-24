# WhereAreWe — 2026-07-24

## Current state

The Expo/React Native iPhone project is versioned and signed for Bruno's paired
iPhone. It has secure password and passkey authentication, a live dashboard,
completed-position history, projections, account switching, foreground-only
refresh, and matched light and dark themes.

## Working trader surfaces

- Expo iPhone app using the same base stack and patterns as Traveliny.
- Password login with secure local token storage.
- Read-only trader dashboard with account switching.
- Four KPI tiles: portfolio value, today's realised P&L, 30-day P&L, and
  open-position long/short split.
- Native open-position tiles based on the trader dashboard information.
- Auto-refresh toggle enabled by default, polling every 10 seconds only while
  the app is active. No background polling.
- Positions is completed history, not the currently open dashboard set.
  It provides owner-scoped account selection, realized summary, LONG/SHORT
  filters, expandable trade details, and cursor-based older-history loading.
- Projections has Daily profit and Year by year sub-tabs. It matches admin's
  realized/projected calendar, five-year combined portfolio outlook, observed
  pessimistic/neutral/optimistic paths, and profit-funded milestone simulation.
- Accounts, Billing, and Profile remain later product slices.
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

## Device gate

The paired physical iPhone is the mobile release target. A mobile release is
not complete until the exact build is signed, installed, launched, and proven
alive on that device.

## Implemented server boundary

- `admin.kraite` serves `api.kraite.com/v1/auth/token`,
  `api.kraite.com/v1/dashboard`, completed-position history, projections,
  passkeys, and token logout.
- Sanctum tokens are stored hashed server-side, expire after 30 days, and only
  carry `dashboard:read`.
- Login and dashboard routes are throttled. Account reads never grant the web
  dashboard's sysadmin cross-user override.
- Dashboard responses reuse proven dashboard calculations while omitting
  browser-only activity and connectivity detail.
- Position history returns only cleanly closed owned positions.
- Projection responses reuse admin's account and fleet financial engines.
- The shared `kraitebot/core` schema owns the personal access token migration.

## Verification

- Signed physical-device build, installation, and launch are mandatory release
  checks.
- TypeScript, targeted unit tests, iOS export, and mobile API feature tests are
  the local release gates.
- Expo Doctor passes all 20 compatibility checks.
