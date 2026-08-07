type PositionTrackLayout = {
  tp_pct: number;
  px_pct: number;
  sl_pct?: number | null;
};

export const POSITION_LABELS = Object.freeze({
  pnl: 'P&L',
  alphaPath: 'α PATH',
  alphaLimit: 'α LIMIT',
  filled: 'FILLED',
  takeProfit: 'TP',
  currentPrice: 'PX',
  nextLimit: 'NEXT',
  limitMove: 'LIM',
  stopLoss: 'SL',
  size: 'SIZE',
  maxPain: 'MAX PAIN',
} as const);

export type PositionMoveIndicator = {
  text: string;
  priceDirection: 'up' | 'down';
};

export function positionMoveIndicator(
  target: 'take-profit' | 'next-limit',
  direction: 'LONG' | 'SHORT',
  distancePercent: string | null | undefined,
): PositionMoveIndicator | null {
  if (distancePercent === null || distancePercent === undefined || !/^\d+(?:\.\d+)?$/.test(distancePercent)) return null;

  const priceDirection = target === 'take-profit'
    ? direction === 'LONG' ? 'up' : 'down'
    : direction === 'LONG' ? 'down' : 'up';
  const label = target === 'take-profit' ? POSITION_LABELS.takeProfit : POSITION_LABELS.limitMove;
  const arrow = priceDirection === 'up' ? '↑' : '↓';

  return {
    text: `${label} ${arrow} ${distancePercent}%`,
    priceDirection,
  };
}

export type PositionTrackMarker = {
  key: 'tp' | 'px' | 'sl';
  label: typeof POSITION_LABELS.takeProfit | typeof POSITION_LABELS.currentPrice | typeof POSITION_LABELS.stopLoss;
  pct: number;
};

export function positionNextTarget(nextLimitPrice: string | null, stopLossPrice: string | null) {
  if (nextLimitPrice) return { label: POSITION_LABELS.nextLimit, price: nextLimitPrice } as const;
  if (stopLossPrice) return { label: POSITION_LABELS.stopLoss, price: stopLossPrice } as const;

  return { label: POSITION_LABELS.nextLimit, price: null } as const;
}

function boundedPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function positionTrackMarkers(track: PositionTrackLayout): PositionTrackMarker[] {
  const slPct = track.sl_pct !== null && track.sl_pct !== undefined && Number.isFinite(track.sl_pct)
    ? track.sl_pct
    : 100;

  return [
    { key: 'tp', label: POSITION_LABELS.takeProfit, pct: boundedPercent(track.tp_pct) },
    { key: 'px', label: POSITION_LABELS.currentPrice, pct: boundedPercent(track.px_pct) },
    { key: 'sl', label: POSITION_LABELS.stopLoss, pct: boundedPercent(slPct) },
  ];
}
