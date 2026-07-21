const minute = 60;
const hour = minute * 60;
const day = hour * 24;

function elapsedLabel(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? '' : 's'} ago`;
}

export function lastPositionClosedLabel(closedAt: string | null | undefined, now = Date.now()): string {
  if (closedAt === null) return 'No positions closed yet';
  if (closedAt === undefined) return 'Last position close unavailable';

  const closedAtMs = Date.parse(closedAt);
  if (!Number.isFinite(closedAtMs)) return 'Last position close unavailable';

  const elapsedSeconds = Math.max(0, Math.floor((now - closedAtMs) / 1000));

  if (elapsedSeconds < minute) return 'Last position closed just now';
  if (elapsedSeconds < hour) return `Last position closed ${elapsedLabel(Math.floor(elapsedSeconds / minute), 'minute')}`;
  if (elapsedSeconds < day) return `Last position closed ${elapsedLabel(Math.floor(elapsedSeconds / hour), 'hour')}`;

  return `Last position closed ${elapsedLabel(Math.floor(elapsedSeconds / day), 'day')}`;
}
