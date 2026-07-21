import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldAutoRefresh } from './refreshPolicy.ts';

test('refreshes only when enabled and active', () => {
  assert.equal(shouldAutoRefresh(true, 'active'), true);
  assert.equal(shouldAutoRefresh(false, 'active'), false);
  assert.equal(shouldAutoRefresh(true, 'background'), false);
  assert.equal(shouldAutoRefresh(true, 'inactive'), false);
  assert.equal(shouldAutoRefresh(true, 'active', false), false);
});
