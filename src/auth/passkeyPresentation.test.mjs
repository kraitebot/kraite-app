import assert from 'node:assert/strict';
import test from 'node:test';

import { isPasskeyCancellation, passkeyErrorMessage, shouldOfferPasskey } from './passkeyPresentation.ts';

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
