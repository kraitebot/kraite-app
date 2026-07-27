import type { BscsSummary } from '../api/types';

export function formatBscsPositionCap(positionCap: BscsSummary['position_cap']): string | null {
  if (!positionCap) return null;

  return `${positionCap.long.effective}/${positionCap.long.maximum} LONG · ${positionCap.short.effective}/${positionCap.short.maximum} SHORT · ${positionCap.ratio_percent}%`;
}

/**
 * One line naming why new openings are paused and until when. Null when
 * nothing is paused. The monitor latch never expires on its own, so it
 * says "until cleared" instead of promising a resumption time. Older
 * server payloads without the pause fields fall back to `blocked`.
 */
export function formatBscsPauseLine(bscs: BscsSummary): string | null {
  const paused = bscs.paused ?? bscs.blocked;
  if (!paused) return null;

  const reason = bscs.pause_reason ?? (bscs.blocked ? 'regime' : null);

  if (reason === 'monitor') {
    return 'OPENINGS PAUSED · error-storm monitor — holds until cleared';
  }

  const cause = reason === 'shock' ? 'market shock breaker' : 'black-swan score gate';

  return bscs.cooldown_remaining
    ? `OPENINGS PAUSED · ${cause} — resumes in ${bscs.cooldown_remaining}`
    : `OPENINGS PAUSED · ${cause}`;
}
