import type { PositionHistory, PositionHistorySummary } from '../api/types';

export type PositionHistoryFilter = 'ALL' | 'LONG' | 'SHORT';

export function historyPositionsForFilter(
  positions: PositionHistory[],
  filter: PositionHistoryFilter,
): PositionHistory[] {
  return filter === 'ALL'
    ? positions
    : positions.filter((position) => position.direction === filter);
}

export function historyWinRate(summary: PositionHistorySummary): number | null {
  const decided = summary.wins + summary.losses;
  return decided > 0 ? (summary.wins / decided) * 100 : null;
}

export function historyDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return '—';
  if (seconds < 60) return '<1m';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;

  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export function historyClosedAgo(closedAt: string | null, now = Date.now()): string {
  if (!closedAt) return 'Closed';

  const elapsedSeconds = Math.max(0, Math.floor((now - new Date(closedAt).getTime()) / 1000));
  if (!Number.isFinite(elapsedSeconds)) return 'Closed';
  if (elapsedSeconds < 60) return 'Closed now';
  if (elapsedSeconds < 3_600) return `Closed ${Math.floor(elapsedSeconds / 60)}m ago`;
  if (elapsedSeconds < 86_400) return `Closed ${Math.floor(elapsedSeconds / 3_600)}h ago`;

  return `Closed ${Math.floor(elapsedSeconds / 86_400)}d ago`;
}

export function historyToken(position: Pick<PositionHistory, 'token' | 'symbol'>): string {
  if (position.token) return position.token;
  return position.symbol.replace(/(?:USDT|USDC|USD)$/u, '') || position.symbol;
}
