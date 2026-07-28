import type { BscsComponent, BscsSummary } from '../api/types';

export function formatBscsPositionCap(positionCap: BscsSummary['position_cap']): string | null {
  if (!positionCap) return null;

  return `${positionCap.long.effective}/${positionCap.long.maximum} LONG · ${positionCap.short.effective}/${positionCap.short.maximum} SHORT · ${positionCap.ratio_percent}%`;
}

function pausedReason(bscs: BscsSummary): 'shock' | 'regime' | 'monitor' | null {
  const paused = bscs.paused ?? bscs.blocked;
  if (!paused) return null;

  return bscs.pause_reason ?? (bscs.blocked ? 'regime' : null) ?? 'regime';
}

/**
 * The tile's plain-English story: what the market looks like right now and
 * what Kraite is doing about it. Replaces the server's one-line status so
 * the phone can be more conversational than the admin widget. Every claim
 * mirrors real engine behaviour — elevated trims trade count and leverage,
 * fragile halves them and tapers margin, critical stops new opens — so the
 * copy never promises softer or harder protection than the trader gets.
 */
export function bscsNarrative(bscs: BscsSummary): string {
  const reason = pausedReason(bscs);

  if (reason === 'monitor') {
    return 'The exchange kept rejecting our requests, so Kraite paused new trades as a precaution. Open positions keep managing themselves. Trading resumes once the connection proves healthy again.';
  }
  if (reason === 'shock') {
    return 'A sudden sharp market drop tripped the safety brake. New trades are on hold while the shock plays out — open positions keep managing themselves as usual.';
  }
  if (reason === 'regime') {
    return 'Market stress climbed past the safety limit. New trades are on hold until conditions calm back down — open positions keep managing themselves as usual.';
  }

  if (bscs.score === null) {
    return 'Waiting for the first market check to come in. Trading runs with its normal settings in the meantime.';
  }

  switch (bscs.band) {
    case 'critical':
      return 'Market stress is extreme. Kraite is at its most defensive and new trades can pause at any moment.';
    case 'fragile':
      return 'The market looks unstable. New trades open with half the usual slots and leverage, and smaller margin, until conditions improve.';
    case 'elevated':
      return 'The market is moving more than usual. Kraite is opening fewer trades with reduced leverage while this lasts.';
    case 'calm':
      return 'Markets look calm. Kraite is trading with its normal settings.';
    default:
      return bscs.status;
  }
}

/**
 * One line promising when new trades come back, shown only while they are
 * paused. The monitor latch never expires on its own, so it points at the
 * connection recovering instead of naming a time; the shock breaker and
 * score gate carry the cooldown countdown when the server sent one. Older
 * server payloads without the pause fields fall back to `blocked`.
 */
export function formatBscsPauseLine(bscs: BscsSummary): string | null {
  const reason = pausedReason(bscs);
  if (reason === null) return null;

  if (reason === 'monitor') {
    return 'NEW TRADES RESUME · once the exchange connection is healthy again';
  }

  return bscs.cooldown_remaining
    ? `NEW TRADES RESUME · in ${bscs.cooldown_remaining}`
    : 'NEW TRADES RESUME · when conditions clear';
}

/**
 * When the market was last assessed and when the next assessment lands —
 * "MARKET CHECKED 12m ago · NEXT in 37m". `next_compute_in` arrives
 * pre-phrased from the server ("in 37m" / "about now"); an older server
 * omits it and the line keeps only the half it can prove.
 */
export function formatBscsCadenceLine(bscs: BscsSummary): string | null {
  const checked = bscs.computed_ago;
  const next = bscs.next_compute_in ?? null;

  if (checked && next) return `MARKET CHECKED ${checked} · NEXT ${next}`;
  if (checked) return `MARKET CHECKED ${checked}`;
  if (next) return `FIRST MARKET CHECK ${next}`;

  return null;
}

/**
 * The five sub-signals to render under the tile, or an empty list when the
 * breakdown stays folded away. It opens once the market leaves the calm
 * band, and also whenever openings are paused — a calm band with every
 * signal quiet is exactly what proves the pause came from our own side
 * (the error-storm latch) rather than from the market.
 */
export function visibleBscsComponents(bscs: BscsSummary): BscsComponent[] {
  const components = bscs.components ?? [];
  if (components.length === 0) return [];

  const paused = bscs.paused ?? bscs.blocked;
  const offCalm = bscs.band !== null && bscs.band !== 'calm';

  return paused || offCalm ? components : [];
}

/**
 * Sub-signal figure for the mono column. The signals sit on different
 * scales, so nothing is normalised — two decimals throughout keeps the
 * column aligned, and a signal with no reading shows a dash.
 */
export function formatBscsComponentValue(value: number | null): string {
  return value === null ? '—' : value.toFixed(2);
}
