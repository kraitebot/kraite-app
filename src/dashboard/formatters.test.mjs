import assert from 'node:assert/strict';
import test from 'node:test';

import { exactUsdPrice } from './formatters.ts';

test('groups an exchange-formatted BTC price without losing its exact decimals', () => {
  assert.equal(exactUsdPrice('68234.56'), '$68,234.56');
  assert.equal(exactUsdPrice('68234.560000000000000001'), '$68,234.560000000000000001');
  assert.equal(exactUsdPrice('68000'), '$68,000');
});

test('keeps missing and malformed BTC prices out of the dashboard', () => {
  assert.equal(exactUsdPrice(null), '—');
  assert.equal(exactUsdPrice('not-a-price'), '—');
});
