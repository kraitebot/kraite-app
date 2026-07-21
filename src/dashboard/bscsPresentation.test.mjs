import assert from 'node:assert/strict';
import test from 'node:test';

import { formatBscsPositionCap } from './bscsPresentation.ts';

test('formats the effective and saved BSCS directional position caps', () => {
  assert.equal(formatBscsPositionCap({
    long: { effective: 3, maximum: 6 },
    short: { effective: 3, maximum: 6 },
    ratio_percent: 50,
  }), '3/6 LONG · 3/6 SHORT · 50%');
});

test('tolerates an older dashboard response without a position cap', () => {
  assert.equal(formatBscsPositionCap(undefined), null);
});
