import assert from 'node:assert/strict';
import test from 'node:test';

import { positionMoveIndicator, positionNextTarget, POSITION_LABELS, positionTrackMarkers } from './trackLayout.ts';

test('keeps the position tile vocabulary coherent', () => {
  assert.deepEqual(POSITION_LABELS, {
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
  });
});

test('shows opposite TP and next-limit price moves for long and short positions', () => {
  assert.deepEqual(positionMoveIndicator('take-profit', 'LONG', '7.00'), { text: 'TP ↑ 7.00%', priceDirection: 'up' });
  assert.deepEqual(positionMoveIndicator('next-limit', 'LONG', '2.45'), { text: 'LIM ↓ 2.45%', priceDirection: 'down' });
  assert.deepEqual(positionMoveIndicator('take-profit', 'SHORT', '7.00'), { text: 'TP ↓ 7.00%', priceDirection: 'down' });
  assert.deepEqual(positionMoveIndicator('next-limit', 'SHORT', '1.50'), { text: 'LIM ↑ 1.50%', priceDirection: 'up' });
});

test('omits target move indicators when the API has no valid distance', () => {
  assert.equal(positionMoveIndicator('take-profit', 'LONG', null), null);
  assert.equal(positionMoveIndicator('take-profit', 'LONG', undefined), null);
  assert.equal(positionMoveIndicator('next-limit', 'SHORT', 'not-a-number'), null);
});

test('pairs NEXT and SL labels with their displayed price', () => {
  assert.deepEqual(positionNextTarget('0.07651', '0.07200'), { label: 'NEXT', price: '0.07651' });
  assert.deepEqual(positionNextTarget(null, '0.07200'), { label: 'SL', price: '0.07200' });
  assert.deepEqual(positionNextTarget(null, null), { label: 'NEXT', price: null });
});

test('anchors TP, PX, and SL labels to their matching rail circles', () => {
  assert.deepEqual(positionTrackMarkers({ tp_pct: 0, px_pct: 13, sl_pct: 100 }), [
    { key: 'tp', label: 'TP', pct: 0 },
    { key: 'px', label: 'PX', pct: 13 },
    { key: 'sl', label: 'SL', pct: 100 },
  ]);

  assert.deepEqual(positionTrackMarkers({ tp_pct: 26, px_pct: 35, sl_pct: 100 }), [
    { key: 'tp', label: 'TP', pct: 26 },
    { key: 'px', label: 'PX', pct: 35 },
    { key: 'sl', label: 'SL', pct: 100 },
  ]);
});

test('bounds malformed marker percentages and tolerates the previous API contract', () => {
  assert.deepEqual(positionTrackMarkers({ tp_pct: -4, px_pct: 104 }), [
    { key: 'tp', label: 'TP', pct: 0 },
    { key: 'px', label: 'PX', pct: 100 },
    { key: 'sl', label: 'SL', pct: 100 },
  ]);
});
