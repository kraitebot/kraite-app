# Changelog

All notable changes to the Kraite mobile app will be documented here.

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
