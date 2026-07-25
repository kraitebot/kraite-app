# Changelog

All notable changes to the Kraite mobile app will be documented here.

## [0.4.0] — 2026-07-25

### Face ID sign-in and the Profile security screen

- [NEW FEATURE] Face ID sign-in is live. The login screen offers it as a direct
  alternative to email and password, and needs neither before the prompt.
- [NEW FEATURE] Profile replaces its placeholder with the trader's identity and
  security surface: who is signed in, plus adding a passkey, seeing when each
  was added and last used, and removing one.
- [IMPROVED] Passkey management now lives in exactly one place. The separate
  Passkeys screen was folded into Profile and removed.
- [IMPROVED] The login button carries a drawn Face ID mark instead of a
  fingerprint, matching what the system prompt actually asks for.
- [IMPROVED] A device that cannot hold passkeys is told so plainly and makes no
  pointless request, instead of showing a failing list.
- [FIXED] A passkey with no recorded creation date rendered as "Added Never
  used". Added and last-used are now separate readings.
- [FIXED] A malformed timestamp from the server crashed the row it appeared in,
  because the date formatter raises rather than degrading. It now falls back to
  a dash.
- [VERIFIED] Type checking, 30 unit tests, Expo Doctor, and the signed
  physical-iPhone build pass. Requires admin.kraite v0.34.0 or later.
- [SKIPPED] The complete suite was intentionally omitted by the light-release
  policy after targeted coverage passed.

## [0.3.0] — 2026-07-25

### Trader account control

- [NEW FEATURE] Accounts replaces its placeholder with the real configuration
  surface: account name, portfolio and trading quote currencies, profit target,
  stop-loss, and per-direction position slots, leverage, and margin.
- [NEW FEATURE] New trading can be stopped immediately from the phone, on its
  own, without saving any other edited field. Open positions stay managed.
- [IMPROVED] The screen states what cannot be changed and why: configuration is
  locked until the account is connected, quote currencies lock while trading is
  enabled or positions are open, and trading cannot be switched on without an
  active subscription and a healthy connection.
- [SAFETY] Only curated values are offered, never free-typed numbers, so a
  risk-relevant setting cannot leave the tested envelope from a device.
- [SAFETY] Saved changes apply to positions opened afterwards; anything already
  open keeps the values it was opened with. Switching accounts with unsaved
  edits asks before discarding them.
- [SAFETY] A sign-in that predates account editing is detected and the trader is
  asked to sign in once more instead of failing silently.
- [VERIFIED] Type checking, 27 unit tests, Expo Doctor, and the signed
  physical-iPhone build pass. Requires admin.kraite v0.34.0 or later.
- [SKIPPED] The complete suite was intentionally omitted by the light-release
  policy after targeted coverage passed.

## [0.2.1] — 2026-07-25

### Projection calendar readability

- [IMPROVED] Daily calendar P&L values are larger, centered, and retain a
  readable minimum size when longer amounts must fit inside a day.
- [VERIFIED] Type checking, targeted projection tests, Expo Doctor, iOS export,
  and the signed physical-iPhone build pass.
- [SKIPPED] The complete suite was intentionally omitted by the light-release
  policy after targeted coverage passed.

## [0.2.0] — 2026-07-24

### Position history and projections

- [NEW FEATURE] Positions is now a closed-position journal with expandable
  trade details and cursor-based history loading.
- [NEW FEATURE] Projections adds Daily profit and Year by year views with
  pessimistic, neutral, and optimistic scenarios.
- [NEW FEATURE] The projection tools include the profit-funded milestone and
  temporary additional-investment simulation from the admin product.
- [IMPROVED] Expo dependencies align with the supported SDK patch versions.
- [VERIFIED] Type checking, 9 targeted tests, Expo Doctor, and the iOS export
  pass.
- [SKIPPED] The complete suite was intentionally omitted by the light-release
  policy after targeted coverage passed.

## [0.1.2] — 2026-07-22

### Dashboard clarity

- [IMPROVED] The open-positions section displays its live position count beside
  the last-close timestamp.

### Verification

- [VERIFIED] Type checking, 18 unit tests, Expo Doctor, and the iOS export pass.

## [0.1.1] — 2026-07-21

### Dashboard clarity

- [IMPROVED] The BSCS card shows effective versus configured LONG and SHORT
  position caps.
- [IMPROVED] The open-positions section shows when the selected account last
  closed a position, with safe fallbacks for older API responses.

## [0.1.0] — 2026-07-21

### First public source release

- [NEW FEATURE] Native read-only trader dashboard with account switching,
  portfolio KPIs, BSCS posture, and open-position lifecycle cards.
- [NEW FEATURE] Revocable device-token login, foreground-only refresh, secure
  local token storage, light and dark themes, and mobile navigation.
- [PREPARED] Face ID and passkey screens, backend contract, and Apple
  association are implemented behind a release flag until signed-device
  distribution is verified.
