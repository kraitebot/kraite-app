import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isPasskeyCancellation,
  passkeyDate,
  passkeyErrorMessage,
  passkeyUsage,
  shouldOfferPasskey,
} from './passkeyPresentation.ts';

test('offers setup once only when the device supports passkeys and the account has none', () => {
  assert.equal(shouldOfferPasskey(true, false, false), true);
  assert.equal(shouldOfferPasskey(false, false, false), false);
  assert.equal(shouldOfferPasskey(true, true, false), false);
  assert.equal(shouldOfferPasskey(true, false, true), false);
});

test('keeps cancellation quiet and gives actionable errors for unavailable credentials', () => {
  assert.equal(isPasskeyCancellation({ error: 'UserCancelled' }), true);
  assert.equal(isPasskeyCancellation(new Error('failed')), false);
  assert.equal(
    passkeyErrorMessage({ error: 'NoCredentials' }),
    'No Kraite passkey is available. Sign in with your password first.',
  );
  assert.equal(
    passkeyErrorMessage({ error: 'BadConfiguration' }),
    'Kraite passkeys are not ready on this device yet.',
  );
});

test('formats passkey dates and refuses to crash on unusable values', () => {
  assert.equal(passkeyDate('2026-07-25T09:15:00Z', 'en-GB', 'UTC'), '25 Jul 2026');
  assert.equal(passkeyDate(null), '—');
  assert.equal(passkeyDate(''), '—');
  assert.equal(passkeyDate(undefined), '—');
  assert.doesNotThrow(() => passkeyDate('not-a-date'));
  assert.equal(passkeyDate('not-a-date'), '—');
});

test('reads a passkey timestamp in the caller-selected time zone', () => {
  // 02:30 UTC is still the previous day in São Paulo. The caller owns the zone,
  // so the same instant must not silently render as two different days.
  assert.equal(passkeyDate('2026-07-25T02:30:00Z', 'en-GB', 'UTC'), '25 Jul 2026');
  assert.equal(passkeyDate('2026-07-25T02:30:00Z', 'en-GB', 'America/Sao_Paulo'), '24 Jul 2026');
});

test('separates never-used from added so a missing date cannot read as usage', () => {
  assert.equal(passkeyUsage(null), 'Never used');
  assert.equal(passkeyUsage(''), 'Never used');
  assert.equal(passkeyUsage('not-a-date'), 'Never used');
  assert.equal(passkeyUsage('2026-07-25T09:15:00Z', 'en-GB', 'UTC'), 'Used 25 Jul 2026');
});
