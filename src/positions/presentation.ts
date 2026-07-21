import type { Position } from '../api/types';

export type PositionFilter = 'ALL' | 'LONG' | 'SHORT';
export type PositionSort = 'RISK' | 'EXPOSURE' | 'P&L';

export type PositionBookSummary = {
  open: number;
  long: number;
  short: number;
  exposure: number;
  pnl: number;
  maxAlphaLimit: number;
};

function number(value: string | number | null): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function positionBookSummary(positions: Position[]): PositionBookSummary {
  return positions.reduce<PositionBookSummary>((summary, position) => ({
    open: summary.open + 1,
    long: summary.long + (position.direction === 'LONG' ? 1 : 0),
    short: summary.short + (position.direction === 'SHORT' ? 1 : 0),
    exposure: summary.exposure + number(position.size),
    pnl: summary.pnl + number(position.pnl),
    maxAlphaLimit: Math.max(summary.maxAlphaLimit, number(position.alpha_limit_pct)),
  }), { open: 0, long: 0, short: 0, exposure: 0, pnl: 0, maxAlphaLimit: 0 });
}

export function positionsForView(positions: Position[], filter: PositionFilter, sort: PositionSort): Position[] {
  const filtered = filter === 'ALL'
    ? positions
    : positions.filter((position) => position.direction === filter);

  const value = (position: Position): number => {
    if (sort === 'EXPOSURE') return number(position.size);
    if (sort === 'P&L') return number(position.pnl);
    return number(position.alpha_limit_pct);
  };

  return [...filtered].sort((left, right) => value(right) - value(left) || left.id - right.id);
}
