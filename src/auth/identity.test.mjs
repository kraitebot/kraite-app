import assert from 'node:assert/strict';
import test from 'node:test';

import { traderInitials } from './identity.ts';

test('builds avatar initials from the first two words of a name', () => {
  assert.equal(traderInitials('Bruno Falcao'), 'BF');
  assert.equal(traderInitials('Bruno'), 'B');
  assert.equal(traderInitials('bruno falcao'), 'BF');
  // Only the first two words count, so a long name stays two letters wide.
  assert.equal(traderInitials('Bruno da Silva Falcao'), 'BD');
});

test('falls back when there is no usable name', () => {
  assert.equal(traderInitials(null), 'TR');
  assert.equal(traderInitials(undefined), 'TR');
  assert.equal(traderInitials(''), 'TR');
  assert.equal(traderInitials('   '), 'TR');
});

test('survives stray whitespace instead of dropping an initial', () => {
  // The previous per-screen copies split without trimming, so a leading or
  // doubled space consumed one of the two slots and rendered just "B".
  assert.equal(traderInitials(' Bruno Falcao'), 'BF');
  assert.equal(traderInitials('Bruno  Falcao'), 'BF');
  assert.equal(traderInitials('  Bruno  Falcao  '), 'BF');
});
