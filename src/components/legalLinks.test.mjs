import assert from 'node:assert/strict';
import test from 'node:test';

import { legalLinks } from './legalLinks.ts';

test('uses the published Kraite legal pages', () => {
  assert.equal(legalLinks.termsOfService, 'https://kraite.com/terms-and-conditions');
  assert.equal(legalLinks.privacyPolicy, 'https://kraite.com/privacy-policy');
});
