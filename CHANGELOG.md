# Changelog

All notable changes to the Kraite mobile app will be documented here.

## [0.14.0] — 2026-08-02

### Trader-day BTC context

- [NEW] The BTC dashboard tile shows compact `TODAY ±x.xx%` context from the
  trader's configured reporting day.
- [IMPROVED] The sparkline color now follows the API's four-hour direction
  signal, and the tile has wider horizontal breathing room.

## [0.13.2] — 2026-08-02

### Even BTC dashboard spacing

- [FIXED] The BTC sparkline now receives the remaining row width after the
  price block, keeping even visual spacing between the price and four signals.

## [0.13.1] — 2026-08-02

### Compact BTC dashboard tile

- [IMPROVED] BTC market context now fits in one horizontal dashboard row with
  the icon, exact price, four-hour sparkline, and four timeframe signals.
- [PRESERVED] The tile continues using the existing dashboard refresh and
  exchange-precision price formatting.

## [0.13.0] — 2026-08-02

### BTC market context on Dashboard

- [NEW] Dashboard now shows BTC's exchange-precision price, four-hour 15m
  sparkline, icon/name, and four active timeframe direction signals.
- [PRESERVED] The tile refreshes with the existing Dashboard request and adds
  no client-side market polling.

## [0.12.0] — 2026-08-02

### Absolute pending notification state

- [FIXED] The iPhone badge now shows the absolute number of pending trader
  notifications, including across multiple devices and consecutive pushes.
- [NEW] Opening with one pending event presents its overlay on Dashboard;
  multiple pending events open the newest-first Notifications list.
- [PRESERVED] Only visible events become read, and the server keeps every
  registered iPhone badge synchronized.

## [0.11.0] — 2026-08-01

### Unread notifications return to the Dashboard

- [NEW] Opening or resuming Kraite presents the newest unread notification on
  the Dashboard while preserving the complete notification history.
- [PRESERVED] A notification becomes read only when visible, and history stays
  ordered newest first.
- [FIXED] A previously handled system-notification tap no longer reopens on a
  later cold launch.

## [0.10.2] — 2026-08-01

### Notification release integration

- [INCLUDED] The production push identity, unread badge behavior, and WAP close
  notification integration from the notification release are carried into the
  coordinated Laravel 13 portfolio release.
- [DEPENDENCY] React Navigation and supporting build dependencies are refreshed
  to their latest compatible patch releases.

## [0.10.1] — 2026-08-01

### iPhone push delivery is connected

- [FIXED] The installed app now carries its Expo project identity, allowing
  an authenticated iPhone to register for remote trader notifications.
- [CONFIGURED] Expo Application Services owns the Apple Push Notifications
  key for `com.kraite.app`.
- [FIXED] A notification received while Kraite is in the background marks the
  Home Screen icon with `1`; opening the app clears it once visible.

## [0.10.0] — 2026-07-30

### Trading events now reach the iPhone

- [NEW] Trader notifications arrive as iPhone system notifications and open
  the Dashboard when tapped.
- [NEW] A notification visible on the Dashboard appears as an overlay and is
  marked read immediately on this iPhone.
- [NEW] More → Notifications shows the trader's complete app notification
  history newest first, with a local unread mark and badge.
- [NEW] BSCS, sudden market-shock, and error-storm breaker activation and
  recovery appear in this history and notify only the iPhone.
- [VERIFIED] Type checking, 61 unit tests, Expo Doctor 20/20, and the iOS
  export pass.

## [0.9.0] — 2026-07-29

### The trading day can follow you, if you say so

- [NEW] Landing in another country offers to move your trading day to local
  time — once, with Keep and Switch. It never changes on its own: your
  trading day is set to match your exchange, and that setting does not travel
  with you.
- [IMPROVED] Daily profit figures now come from the exchange's own record of
  every fee and fill, counted on the day it was charged, so a position held
  across midnight no longer distorts either day.

## [0.8.1] — 2026-07-29

### The installed app reports the release it actually is

- [FIXED] `app.json` and the native `Info.plist` had drifted apart on the
  build number (7 against 8), so a release could not say for certain which
  build a phone was running. Both now move together, and this is the tag
  installed on the paired iPhone.

## [0.8.0] — 2026-07-29

### The calendar states which trading day it is drawn on

- [NEW] The daily profit calendar names the trading day basis its figures
  are counted on (for example `UTC+02:00`), the same basis set on the
  trader's profile and on their exchange.
- [FIXED] The calendar opens on the month the trader is actually in rather
  than the month the handset's clock is in. A trader whose day rolls at
  UTC+2 could be a day — and at month's end a whole month — ahead of the
  device's own reckoning.

## [0.7.1] — 2026-07-28

### Correct version label on the installed app

- [FIXED] The iPhone build now reports its real release version (0.7.1,
  build 8) instead of the stale 0.4.1 label carried since the native project
  was created.

## [0.7.0] — 2026-07-28

### The regime tile is easier to read — and folds away when you're done

- [IMPROVED] Every small label on the market-regime tile got a size bump: the
  story text, pause/resume line, cadence and cap lines, scale labels, and the
  warning-signal rows are all noticeably more legible.
- [NEW FEATURE] The tile is now collapsible, matching the position cards: tap
  the header to fold it down to the band, score, plain-English story, and the
  resume line when trading is paused. Expanding reveals the cadence line,
  position caps, the Calm→Critical scale, and the warning signals.
- [VERIFIED] Type checking and 53 unit tests pass.

## [0.6.0] — 2026-07-28

### The regime tile now explains itself — and promises the next market check

- [IMPROVED] The status line is a plain-English story per situation: the
  sudden-drop safety brake, the market-stress score gate, or the exchange
  error-storm pause — each adds that open positions keep managing themselves,
  and the calm/elevated/fragile/critical bands say what the engine actually
  does (fewer trades, reduced leverage, half the usual slots, most defensive).
- [IMPROVED] The red pause line now leads with when trading resumes:
  "NEW TRADES RESUME · in 43m", or "once the exchange connection is healthy
  again" for the monitor latch that carries no countdown.
- [NEW FEATURE] A cadence line shows when the market was last checked and a
  countdown to the next hourly assessment ("MARKET CHECKED 12m ago · NEXT in
  37m"), served pre-phrased by the API.
- [NEW FEATURE] The five warning signals unfold on the tile whenever the
  market leaves Calm or openings are paused; tapping one opens a plain-English
  explanation sheet with the current reading and fired state.
- [UNCHANGED] Older servers without the new countdown field degrade
  gracefully — the tile keeps only what it can prove.
- [VERIFIED] Type checking, 53 unit tests, Expo Doctor (20/20), and the iOS
  export pass.

## [0.5.0] — 2026-07-27

### The market-regime tile now tells you when openings are paused — and until when

- [NEW FEATURE] A red line under the regime status names the pause source:
  "market shock breaker — resumes in 43m", "black-swan score gate" with its
  countdown, or "error-storm monitor — holds until cleared". Until now the
  phone had no pause information at all: during the 2026-07-27 event, openings
  sat parked for four hours with the tile reading calm.
- [UNCHANGED] Older servers without the new fields degrade gracefully to the
  previous blocked-only display.
- [VERIFIED] Type checking, 38 unit tests (5 new pause-line cases), and Expo
  Doctor pass.

## [0.4.1] — 2026-07-25

### One shared screen header

- [IMPROVED] Dashboard, Positions, Projections, and Accounts now share a single
  header instead of each carrying its own identical copy. A change to the brand
  bar, theme toggle, or avatar is made once and every screen follows, rather
  than needing the same edit in four places with one easy to miss.
- [FIXED] Avatar initials no longer lose a letter when a trader's name carries a
  leading or doubled space. The old per-screen copies split the name without
  trimming it first, so " Bruno Falcao" showed a single initial.
- [VERIFIED] Type checking, 33 unit tests, Expo Doctor, and the signed
  physical-iPhone build pass. No visible change to any screen.

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
