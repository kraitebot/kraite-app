import assert from 'node:assert/strict';
import test from 'node:test';

import {
  historyClosedAgo,
  historyDuration,
  historyPositionsForFilter,
  historyToken,
  historyWinRate,
} from './presentation.ts';

const positions = [
  { id: 31, direction: 'LONG' },
  { id: 12, direction: 'SHORT' },
  { id: 19, direction: 'LONG' },
];

test('filters completed positions by exact side without changing history order', () => {
  const before = structuredClone(positions);

  assert.deepEqual(historyPositionsForFilter(positions, 'ALL').map(({ id }) => id), [31, 12, 19]);
  assert.deepEqual(historyPositionsForFilter(positions, 'LONG').map(({ id }) => id), [31, 19]);
  assert.deepEqual(historyPositionsForFilter(positions, 'SHORT').map(({ id }) => id), [12]);
  assert.deepEqual(positions, before);
});

test('computes win rate only from decided realized results', () => {
  assert.equal(historyWinRate({ wins: 7, losses: 3 }), 70);
  assert.equal(historyWinRate({ wins: 0, losses: 0 }), null);
});

test('formats compact holding durations across minute hour and day boundaries', () => {
  assert.equal(historyDuration(null), '—');
  assert.equal(historyDuration(20), '<1m');
  assert.equal(historyDuration(59 * 60), '59m');
  assert.equal(historyDuration((3 * 60 + 8) * 60), '3h 8m');
  assert.equal(historyDuration((2 * 24 + 5) * 60 * 60), '2d 5h');
});

test('formats closed age and token fallback without invalid dates leaking into copy', () => {
  const now = Date.parse('2026-07-24T12:00:00Z');

  assert.equal(historyClosedAgo('2026-07-24T11:42:00Z', now), 'Closed 18m ago');
  assert.equal(historyClosedAgo('2026-07-22T12:00:00Z', now), 'Closed 2d ago');
  assert.equal(historyClosedAgo('not-a-date', now), 'Closed');
  assert.equal(historyToken({ token: 'ETH', symbol: 'ETHUSDT' }), 'ETH');
  assert.equal(historyToken({ token: null, symbol: 'SOLUSDT' }), 'SOL');
});
