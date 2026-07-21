import assert from 'node:assert/strict';
import test from 'node:test';

import { positionNextTarget, POSITION_LABELS, positionTrackMarkers } from './trackLayout.ts';

test('keeps the position tile vocabulary coherent', () => {
  assert.deepEqual(POSITION_LABELS, {
    pnl: 'P&L',
    alphaPath: 'α PATH',
    alphaLimit: 'α LIMIT',
    filled: 'FILLED',
    takeProfit: 'TP',
    currentPrice: 'PX',
    nextLimit: 'NEXT',
    stopLoss: 'SL',
    size: 'SIZE',
  });
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
