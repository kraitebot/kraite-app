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

const pauseBase = {
  score: 12,
  band: 'calm',
  blocked: false,
  status: 'Market normal.',
  is_stale: false,
  block_threshold: 80,
  computed_ago: null,
};

test('says nothing when openings are not paused', async () => {
  const { formatBscsPauseLine } = await import('./bscsPresentation.ts');
  assert.equal(formatBscsPauseLine({ ...pauseBase, paused: false }), null);
});

test('names the error-storm monitor with no resumption promise', async () => {
  const { formatBscsPauseLine } = await import('./bscsPresentation.ts');
  assert.equal(
    formatBscsPauseLine({ ...pauseBase, paused: true, pause_reason: 'monitor', cooldown_remaining: null }),
    'OPENINGS PAUSED · error-storm monitor — holds until cleared',
  );
});

test('names the shock breaker with the remaining window', async () => {
  const { formatBscsPauseLine } = await import('./bscsPresentation.ts');
  assert.equal(
    formatBscsPauseLine({ ...pauseBase, paused: true, pause_reason: 'shock', cooldown_remaining: '43m' }),
    'OPENINGS PAUSED · market shock breaker — resumes in 43m',
  );
});

test('names the score gate and tolerates a missing countdown', async () => {
  const { formatBscsPauseLine } = await import('./bscsPresentation.ts');
  assert.equal(
    formatBscsPauseLine({ ...pauseBase, paused: true, pause_reason: 'regime', cooldown_remaining: null }),
    'OPENINGS PAUSED · black-swan score gate',
  );
});

test('falls back to blocked for an older server payload without pause fields', async () => {
  const { formatBscsPauseLine } = await import('./bscsPresentation.ts');
  assert.equal(
    formatBscsPauseLine({ ...pauseBase, blocked: true }),
    'OPENINGS PAUSED · black-swan score gate',
  );
});
