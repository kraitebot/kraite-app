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

test('points the monitor latch at connection health, never a time', async () => {
  const { formatBscsPauseLine } = await import('./bscsPresentation.ts');
  assert.equal(
    formatBscsPauseLine({ ...pauseBase, paused: true, pause_reason: 'monitor', cooldown_remaining: null }),
    'NEW TRADES RESUME · once the exchange connection is healthy again',
  );
});

test('promises the shock-breaker resumption with the remaining window', async () => {
  const { formatBscsPauseLine } = await import('./bscsPresentation.ts');
  assert.equal(
    formatBscsPauseLine({ ...pauseBase, paused: true, pause_reason: 'shock', cooldown_remaining: '43m' }),
    'NEW TRADES RESUME · in 43m',
  );
});

test('stays honest when the score gate carries no countdown', async () => {
  const { formatBscsPauseLine } = await import('./bscsPresentation.ts');
  assert.equal(
    formatBscsPauseLine({ ...pauseBase, paused: true, pause_reason: 'regime', cooldown_remaining: null }),
    'NEW TRADES RESUME · when conditions clear',
  );
});

test('falls back to blocked for an older server payload without pause fields', async () => {
  const { formatBscsPauseLine } = await import('./bscsPresentation.ts');
  assert.equal(
    formatBscsPauseLine({ ...pauseBase, blocked: true, cooldown_remaining: '2h 10m' }),
    'NEW TRADES RESUME · in 2h 10m',
  );
});

test('tells the exchange-failure story when the monitor latch pauses trading', async () => {
  const { bscsNarrative } = await import('./bscsPresentation.ts');
  const narrative = bscsNarrative({ ...pauseBase, paused: true, pause_reason: 'monitor' });
  assert.match(narrative, /exchange kept rejecting/);
  assert.match(narrative, /paused new trades/);
  assert.match(narrative, /connection proves healthy/);
});

test('tells the sudden-drop story for a shock-breaker pause', async () => {
  const { bscsNarrative } = await import('./bscsPresentation.ts');
  const narrative = bscsNarrative({ ...pauseBase, paused: true, pause_reason: 'shock' });
  assert.match(narrative, /sudden sharp market drop/);
  assert.match(narrative, /open positions keep managing themselves/i);
});

test('tells the market-stress story for a score-gate pause, and for older blocked payloads', async () => {
  const { bscsNarrative } = await import('./bscsPresentation.ts');
  const gate = bscsNarrative({ ...pauseBase, paused: true, pause_reason: 'regime' });
  assert.match(gate, /stress climbed past the safety limit/);
  assert.equal(bscsNarrative({ ...pauseBase, blocked: true }), gate);
});

test('narrates every unpaused band in plain english', async () => {
  const { bscsNarrative } = await import('./bscsPresentation.ts');
  assert.match(bscsNarrative({ ...pauseBase, band: 'calm' }), /trading with its normal settings/);
  assert.match(bscsNarrative({ ...pauseBase, band: 'elevated' }), /fewer trades with reduced leverage/);
  assert.match(bscsNarrative({ ...pauseBase, band: 'fragile' }), /half the usual slots and leverage/);
  assert.match(bscsNarrative({ ...pauseBase, band: 'critical' }), /most defensive/);
  assert.match(bscsNarrative({ ...pauseBase, score: null, band: null }), /first market check/);
});

test('keeps the server status as a last resort for an unknown band', async () => {
  const { bscsNarrative } = await import('./bscsPresentation.ts');
  assert.equal(bscsNarrative({ ...pauseBase, band: 'unheard-of' }), 'Market normal.');
});

test('pairs the last check with the next one on the cadence line', async () => {
  const { formatBscsCadenceLine } = await import('./bscsPresentation.ts');
  assert.equal(
    formatBscsCadenceLine({ ...pauseBase, computed_ago: '12m ago', next_compute_in: 'in 37m' }),
    'MARKET CHECKED 12m ago · NEXT in 37m',
  );
});

test('keeps only the provable half of the cadence line', async () => {
  const { formatBscsCadenceLine } = await import('./bscsPresentation.ts');
  assert.equal(
    formatBscsCadenceLine({ ...pauseBase, computed_ago: '12m ago' }),
    'MARKET CHECKED 12m ago',
  );
  assert.equal(
    formatBscsCadenceLine({ ...pauseBase, computed_ago: null, next_compute_in: 'about now' }),
    'FIRST MARKET CHECK about now',
  );
  assert.equal(formatBscsCadenceLine({ ...pauseBase, computed_ago: null }), null);
});

const components = [
  { key: 'vol_expansion', label: 'Vol expansion', value: 1.42, fired: true },
  { key: 'corr_regime', label: 'Correlation regime', value: 0.51, fired: false },
];

test('folds the sub-signal breakdown away while the market reads calm', async () => {
  const { visibleBscsComponents } = await import('./bscsPresentation.ts');
  assert.deepEqual(visibleBscsComponents({ ...pauseBase, band: 'calm', components }), []);
});

test('opens the breakdown once the market leaves calm', async () => {
  const { visibleBscsComponents } = await import('./bscsPresentation.ts');
  for (const band of ['elevated', 'fragile', 'critical']) {
    assert.deepEqual(visibleBscsComponents({ ...pauseBase, band, components }), components);
  }
});

test('opens the breakdown on a calm market whose openings are parked', async () => {
  const { visibleBscsComponents } = await import('./bscsPresentation.ts');
  assert.deepEqual(
    visibleBscsComponents({ ...pauseBase, band: 'calm', paused: true, pause_reason: 'monitor', components }),
    components,
  );
});

test('opens the breakdown for an older payload that only reports blocked', async () => {
  const { visibleBscsComponents } = await import('./bscsPresentation.ts');
  assert.deepEqual(
    visibleBscsComponents({ ...pauseBase, band: 'calm', blocked: true, components }),
    components,
  );
});

test('stays folded when the band is unknown and nothing is paused', async () => {
  const { visibleBscsComponents } = await import('./bscsPresentation.ts');
  assert.deepEqual(visibleBscsComponents({ ...pauseBase, band: null, components }), []);
});

test('shows nothing before the first compute and on an older server', async () => {
  const { visibleBscsComponents } = await import('./bscsPresentation.ts');
  assert.deepEqual(visibleBscsComponents({ ...pauseBase, band: 'critical', components: [] }), []);
  assert.deepEqual(visibleBscsComponents({ ...pauseBase, band: 'critical' }), []);
});

test('renders sub-signal figures at a fixed two decimals, dash when unread', async () => {
  const { formatBscsComponentValue } = await import('./bscsPresentation.ts');
  assert.equal(formatBscsComponentValue(1.4), '1.40');
  assert.equal(formatBscsComponentValue(-7.25), '-7.25');
  assert.equal(formatBscsComponentValue(0), '0.00');
  assert.equal(formatBscsComponentValue(null), '—');
});

test('carries an explanation for every signal the server sends', async () => {
  const { bscsSignalCopy } = await import('./bscsSignals.ts');
  for (const key of ['vol_expansion', 'range_blowout', 'corr_regime', 'rejection_pct', 'fut_vol']) {
    const copy = bscsSignalCopy(key);
    assert.ok(copy, `missing explanation for ${key}`);
    assert.ok(copy.title.length > 0);
    assert.ok(copy.tip.endsWith('?'));
    assert.equal(copy.body.length, 3);
  }
  assert.equal(bscsSignalCopy('signal_we_never_shipped'), null);
});
