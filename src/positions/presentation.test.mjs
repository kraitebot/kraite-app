import assert from 'node:assert/strict';
import test from 'node:test';

import { positionBookSummary, positionsForView } from './presentation.ts';

const positions = [
  { id: 31, direction: 'LONG', size: '250.50', pnl: '-7.25', alpha_limit_pct: '33.90' },
  { id: 12, direction: 'SHORT', size: '80.00', pnl: '14.75', alpha_limit_pct: '61.20' },
  { id: 19, direction: 'LONG', size: null, pnl: null, alpha_limit_pct: '61.20' },
];

test('summarizes the exact open book including null numeric values', () => {
  assert.deepEqual(positionBookSummary(positions), {
    open: 3,
    long: 2,
    short: 1,
    exposure: 330.5,
    pnl: 7.5,
    maxAlphaLimit: 61.2,
  });
  assert.deepEqual(positionBookSummary([]), {
    open: 0,
    long: 0,
    short: 0,
    exposure: 0,
    pnl: 0,
    maxAlphaLimit: 0,
  });
});

test('filters exact sides without changing the source book', () => {
  const before = structuredClone(positions);

  assert.deepEqual(positionsForView(positions, 'ALL', 'RISK').map(({ id }) => id), [12, 19, 31]);
  assert.deepEqual(positionsForView(positions, 'LONG', 'RISK').map(({ id }) => id), [19, 31]);
  assert.deepEqual(positionsForView(positions, 'SHORT', 'RISK').map(({ id }) => id), [12]);
  assert.deepEqual(positions, before);
});

test('sorts descending by risk, exposure, and profit with deterministic ties', () => {
  assert.deepEqual(positionsForView(positions, 'ALL', 'RISK').map(({ id }) => id), [12, 19, 31]);
  assert.deepEqual(positionsForView(positions, 'ALL', 'EXPOSURE').map(({ id }) => id), [31, 12, 19]);
  assert.deepEqual(positionsForView(positions, 'ALL', 'P&L').map(({ id }) => id), [12, 19, 31]);
  assert.deepEqual(positionsForView([], 'ALL', 'RISK'), []);
});
