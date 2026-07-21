import type { BscsSummary } from '../api/types';

export function formatBscsPositionCap(positionCap: BscsSummary['position_cap']): string | null {
  if (!positionCap) return null;

  return `${positionCap.long.effective}/${positionCap.long.maximum} LONG · ${positionCap.short.effective}/${positionCap.short.maximum} SHORT · ${positionCap.ratio_percent}%`;
}
